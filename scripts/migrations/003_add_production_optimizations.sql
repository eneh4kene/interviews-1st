-- Production optimizations and monitoring
-- This migration adds production-ready optimizations

-- Add connection pooling settings
ALTER DATABASE interviewsfirst SET log_statement = 'mod';
ALTER DATABASE interviewsfirst SET log_min_duration_statement = 1000;
ALTER DATABASE interviewsfirst SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Add database monitoring views
CREATE OR REPLACE VIEW database_stats AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Add performance monitoring view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time) as avg_response_time,
    MAX(response_time) as max_response_time,
    MIN(response_time) as min_response_time,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END)::numeric / COUNT(*) * 100, 2) as error_rate
FROM performance_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method
ORDER BY request_count DESC;

-- Add security monitoring view
CREATE OR REPLACE VIEW security_summary AS
SELECT 
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM security_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- Add data retention policies
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs 
    WHERE changed_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Add database health check function
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    message TEXT,
    value NUMERIC
) AS $$
BEGIN
    -- Check database size
    RETURN QUERY
    SELECT 
        'database_size'::TEXT,
        CASE 
            WHEN pg_database_size(current_database()) < 1073741824 THEN 'healthy'::TEXT
            ELSE 'warning'::TEXT
        END,
        'Database size: ' || pg_size_pretty(pg_database_size(current_database())),
        pg_database_size(current_database())::NUMERIC;
    
    -- Check active connections
    RETURN QUERY
    SELECT 
        'active_connections'::TEXT,
        CASE 
            WHEN (SELECT count(*) FROM pg_stat_activity) < 50 THEN 'healthy'::TEXT
            ELSE 'warning'::TEXT
        END,
        'Active connections: ' || (SELECT count(*) FROM pg_stat_activity),
        (SELECT count(*) FROM pg_stat_activity)::NUMERIC;
    
    -- Check slow queries
    RETURN QUERY
    SELECT 
        'slow_queries'::TEXT,
        CASE 
            WHEN (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds') = 0 THEN 'healthy'::TEXT
            ELSE 'warning'::TEXT
        END,
        'Slow queries: ' || (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds'),
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds')::NUMERIC;
    
    -- Check table bloat
    RETURN QUERY
    SELECT 
        'table_bloat'::TEXT,
        CASE 
            WHEN (SELECT sum(n_dead_tup) FROM pg_stat_user_tables) < 10000 THEN 'healthy'::TEXT
            ELSE 'warning'::TEXT
        END,
        'Dead tuples: ' || (SELECT sum(n_dead_tup) FROM pg_stat_user_tables),
        (SELECT sum(n_dead_tup) FROM pg_stat_user_tables)::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at_desc ON audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at_desc ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at_desc ON security_events(created_at DESC);

-- Add partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_slow_queries 
ON performance_metrics(created_at) 
WHERE response_time > 1000;

CREATE INDEX IF NOT EXISTS idx_security_events_high_severity 
ON security_events(created_at) 
WHERE severity IN ('HIGH', 'CRITICAL');

-- Add database maintenance function
CREATE OR REPLACE FUNCTION maintain_database()
RETURNS void AS $$
BEGIN
    -- Analyze tables for better query planning
    ANALYZE;
    
    -- Vacuum tables to reclaim space
    VACUUM ANALYZE;
    
    -- Log maintenance completion
    INSERT INTO security_events (event_type, severity, description)
    VALUES ('DATABASE_MAINTENANCE', 'LOW', 'Database maintenance completed successfully');
END;
$$ LANGUAGE plpgsql;
