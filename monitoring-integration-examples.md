# Monitoring Personnel Perspective - Integration Examples

## 1. Prometheus + Grafana Integration

### Prometheus Configuration (prometheus.yml)
```yaml
scrape_configs:
  - job_name: 'interviewsfirst-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard Queries
```promql
# Response Time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error Rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Memory Usage
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100

# Request Rate
rate(http_requests_total[5m])
```

## 2. Kubernetes Monitoring

### Health Check Probes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: interviewsfirst-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: interviewsfirst/api:latest
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 3. ELK Stack (Elasticsearch, Logstash, Kibana)

### Logstash Configuration
```ruby
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "interviewsfirst-api" {
    json {
      source => "message"
    }
    
    if [level] == "ERROR" {
      mutate {
        add_tag => [ "error", "critical" ]
      }
    }
    
    if [level] == "WARN" {
      mutate {
        add_tag => [ "warning" ]
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "interviewsfirst-logs-%{+YYYY.MM.dd}"
  }
}
```

### Kibana Dashboard Queries
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "timestamp": {
              "gte": "now-1h"
            }
          }
        },
        {
          "term": {
            "level": "ERROR"
          }
        }
      ]
    }
  }
}
```

## 4. PagerDuty Integration

### Alert Rules
```yaml
rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"
```

## 5. Slack/Teams Notifications

### Webhook Integration
```javascript
// Slack webhook for critical alerts
const sendSlackAlert = async (alert) => {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  const message = {
    text: `🚨 *InterviewsFirst Alert*`,
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'Service', value: 'API Server', short: true },
        { title: 'Severity', value: alert.severity, short: true },
        { title: 'Message', value: alert.message, short: false },
        { title: 'Timestamp', value: new Date().toISOString(), short: true }
      ]
    }]
  };
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
};
```

## 6. Custom Monitoring Scripts

### Health Check Script
```bash
#!/bin/bash
# health-check.sh

API_URL="http://localhost:3001"
ALERT_EMAIL="ops@interviewsfirst.com"

check_health() {
  local response=$(curl -s -w "%{http_code}" "$API_URL/health/ready")
  local http_code="${response: -3}"
  local body="${response%???}"
  
  if [ "$http_code" != "200" ]; then
    echo "CRITICAL: API health check failed (HTTP $http_code)"
    echo "$body" | mail -s "InterviewsFirst API Down" "$ALERT_EMAIL"
    exit 1
  fi
  
  echo "OK: API health check passed"
}

check_health
```

### Performance Monitoring Script
```bash
#!/bin/bash
# performance-monitor.sh

API_URL="http://localhost:3001"
THRESHOLD_MS=1000

check_performance() {
  local metrics=$(curl -s "$API_URL/metrics")
  local avg_response=$(echo "$metrics" | jq -r '.metrics.averageResponseTime')
  
  if [ "$avg_response" -gt "$THRESHOLD_MS" ]; then
    echo "WARNING: Average response time is ${avg_response}ms (threshold: ${THRESHOLD_MS}ms)"
    # Send alert to monitoring system
  else
    echo "OK: Average response time is ${avg_response}ms"
  fi
}

check_performance
```

## 7. Database Monitoring

### PostgreSQL Monitoring Queries
```sql
-- Active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('interviewsfirst'));
```

## 8. Real-time Monitoring Dashboard

### Live Dashboard Features
- **Real-time metrics**: Auto-refreshing every 30 seconds
- **Alert indicators**: Red/yellow/green status indicators
- **Historical data**: Charts showing trends over time
- **Drill-down capability**: Click to see detailed logs
- **Custom filters**: Filter by time range, severity, service
- **Mobile responsive**: Access from any device

### Key Metrics Displayed
- System health status
- Response time trends
- Error rate over time
- Memory usage patterns
- Database connection status
- Active user sessions
- API endpoint usage
- Security events
