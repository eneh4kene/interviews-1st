#!/bin/bash

# Load Testing Script for InterviewsFirst
# SAFE: Only adds new testing script, doesn't modify existing functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-"http://localhost:3001"}
TEST_TYPE=${TEST_TYPE:-"performance"}
OUTPUT_DIR=${OUTPUT_DIR:-"./load-test-results"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if artillery is available
    if ! npx artillery --version &> /dev/null; then
        error "Artillery is not available. Run: npm install -D artillery"
        exit 1
    fi
    
    # Check if API is running
    if ! curl -s "$API_URL/health" > /dev/null; then
        error "API is not running at $API_URL"
        exit 1
    fi
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    log "Prerequisites check passed"
}

# Run performance test
run_performance_test() {
    log "Running performance test..."
    
    local test_file="load-tests/performance-test.yml"
    local output_file="$OUTPUT_DIR/performance-test-$TIMESTAMP.json"
    local report_file="$OUTPUT_DIR/performance-report-$TIMESTAMP.html"
    
    # Update API URL in test file
    sed "s|http://localhost:3001|$API_URL|g" "$test_file" > "/tmp/performance-test-$TIMESTAMP.yml"
    
    # Run the test
    npx artillery run "/tmp/performance-test-$TIMESTAMP.yml" \
        --output "$output_file" \
        --config "load-tests/performance-test.yml"
    
    # Generate HTML report
    npx artillery report "$output_file" --output "$report_file"
    
    log "Performance test completed"
    log "Results saved to: $output_file"
    log "Report saved to: $report_file"
    
    # Clean up temp file
    rm "/tmp/performance-test-$TIMESTAMP.yml"
}

# Run stress test
run_stress_test() {
    log "Running stress test..."
    
    local test_file="load-tests/stress-test.yml"
    local output_file="$OUTPUT_DIR/stress-test-$TIMESTAMP.json"
    local report_file="$OUTPUT_DIR/stress-report-$TIMESTAMP.html"
    
    # Create stress test configuration
    cat > "/tmp/stress-test-$TIMESTAMP.yml" << EOF
config:
  target: '$API_URL'
  phases:
    - duration: 60
      arrivalRate: 100
      name: "High load"
    - duration: 30
      arrivalRate: 200
      name: "Peak load"
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "High Load Test"
    flow:
      - get:
          url: "/health"
      - get:
          url: "/metrics"
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@interviewsfirst.com"
            password: "admin123"
EOF
    
    # Run the test
    npx artillery run "/tmp/stress-test-$TIMESTAMP.yml" \
        --output "$output_file"
    
    # Generate HTML report
    npx artillery report "$output_file" --output "$report_file"
    
    log "Stress test completed"
    log "Results saved to: $output_file"
    log "Report saved to: $report_file"
    
    # Clean up temp file
    rm "/tmp/stress-test-$TIMESTAMP.yml"
}

# Run smoke test
run_smoke_test() {
    log "Running smoke test..."
    
    local test_file="load-tests/smoke-test.yml"
    local output_file="$OUTPUT_DIR/smoke-test-$TIMESTAMP.json"
    
    # Create smoke test configuration
    cat > "/tmp/smoke-test-$TIMESTAMP.yml" << EOF
config:
  target: '$API_URL'
  phases:
    - duration: 10
      arrivalRate: 1
      name: "Smoke test"
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "Smoke Test"
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
      - get:
          url: "/health/ready"
          expect:
            - statusCode: 200
      - get:
          url: "/health/live"
          expect:
            - statusCode: 200
      - get:
          url: "/metrics"
          expect:
            - statusCode: 200
EOF
    
    # Run the test
    npx artillery run "/tmp/smoke-test-$TIMESTAMP.yml" \
        --output "$output_file"
    
    log "Smoke test completed"
    log "Results saved to: $output_file"
    
    # Clean up temp file
    rm "/tmp/smoke-test-$TIMESTAMP.yml"
}

# Analyze results
analyze_results() {
    log "Analyzing test results..."
    
    local results_dir="$OUTPUT_DIR"
    local latest_file=$(ls -t "$results_dir"/*.json | head -1)
    
    if [ -z "$latest_file" ]; then
        warn "No test results found to analyze"
        return
    fi
    
    log "Analyzing: $latest_file"
    
    # Extract key metrics
    local total_requests=$(jq '.aggregate.counters["http.requests"] // 0' "$latest_file")
    local success_rate=$(jq '.aggregate.rates["http.codes.200"] // 0' "$latest_file")
    local avg_response_time=$(jq '.aggregate.summaries["http.response_time"]["mean"] // 0' "$latest_file")
    local p95_response_time=$(jq '.aggregate.summaries["http.response_time"]["p95"] // 0' "$latest_file")
    
    echo ""
    echo "📊 Test Results Summary:"
    echo "========================"
    echo "Total Requests: $total_requests"
    echo "Success Rate: $(echo "$success_rate * 100" | bc -l)%"
    echo "Average Response Time: ${avg_response_time}ms"
    echo "95th Percentile Response Time: ${p95_response_time}ms"
    echo ""
    
    # Performance recommendations
    if (( $(echo "$avg_response_time > 500" | bc -l) )); then
        warn "Average response time is high (>500ms). Consider optimization."
    fi
    
    if (( $(echo "$p95_response_time > 1000" | bc -l) )); then
        warn "95th percentile response time is high (>1000ms). Consider optimization."
    fi
    
    if (( $(echo "$success_rate < 0.95" | bc -l) )); then
        warn "Success rate is low (<95%). Check for errors."
    fi
}

# Main function
main() {
    log "Starting load testing..."
    
    check_prerequisites
    
    case "$TEST_TYPE" in
        performance)
            run_performance_test
            ;;
        stress)
            run_stress_test
            ;;
        smoke)
            run_smoke_test
            ;;
        all)
            run_smoke_test
            run_performance_test
            run_stress_test
            ;;
        *)
            error "Invalid test type: $TEST_TYPE"
            echo "Usage: $0 [performance|stress|smoke|all]"
            exit 1
            ;;
    esac
    
    analyze_results
    
    log "Load testing completed!"
    info "Results directory: $OUTPUT_DIR"
}

# CLI interface
if [ $# -eq 0 ]; then
    main
else
    TEST_TYPE="$1"
    main
fi
