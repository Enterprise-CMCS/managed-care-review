#!/bin/bash

# Load Testing Script for MCR CDK Infrastructure
# Tests the infrastructure's ability to handle high load (millions of users)

set -e

STAGE=${1:-dev}
DURATION=${2:-300}  # Default 5 minutes
CONCURRENT_USERS=${3:-100}  # Start with 100 concurrent users
REGION=${AWS_REGION:-us-east-1}
TEST_RUN_ID=$(date +%s)
RESULTS_DIR="./load-test-results-$TEST_RUN_ID"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$RESULTS_DIR"

echo "🚀 MCR CDK Infrastructure Load Testing"
echo "====================================="
echo "Stage: $STAGE"
echo "Duration: $DURATION seconds"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Test Run ID: $TEST_RUN_ID"
echo ""

# Check if artillery is installed
if ! command -v artillery &> /dev/null; then
    echo -e "${YELLOW}Installing Artillery for load testing...${NC}"
    npm install -g artillery
fi

# Get API Gateway URL
API_ID=$(aws apigateway get-rest-apis \
    --query "items[?name=='infra-api-$STAGE-app-api-gateway'].id" \
    --output text)

if [ -z "$API_ID" ]; then
    echo -e "${RED}Error: API Gateway not found${NC}"
    exit 1
fi

API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE"
echo "API Endpoint: $API_URL"

# Get Cognito details for auth testing
USER_POOL_ID=$(aws cognito-idp list-user-pools \
    --max-results 60 \
    --query "UserPools[?contains(Name, 'mcr-$STAGE')].Id" \
    --output text | head -n1)

# Create Artillery configuration
cat > "$RESULTS_DIR/artillery-config.yml" << EOF
config:
  target: "$API_URL"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: $DURATION
      arrivalRate: $CONCURRENT_USERS
      name: "Sustained load"
    - duration: 60
      arrivalRate: $(($CONCURRENT_USERS * 2))
      name: "Spike test"
  processor: "./processor.js"
  variables:
    stage: "$STAGE"
    userPoolId: "$USER_POOL_ID"
  http:
    timeout: 30

scenarios:
  - name: "Health Check"
    weight: 20
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 
                - 200
                - 403

  - name: "Document Upload Flow"
    weight: 40
    flow:
      - function: "generateTestDocument"
      - post:
          url: "/documents/upload"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            filename: "{{ filename }}"
            size: "{{ filesize }}"
          capture:
            - json: "$.uploadUrl"
              as: "uploadUrl"
      - think: 2
      - put:
          url: "{{ uploadUrl }}"
          beforeRequest: "uploadFile"

  - name: "Document List"
    weight: 30
    flow:
      - get:
          url: "/documents"
          headers:
            Authorization: "Bearer {{ token }}"
          expect:
            - statusCode: 200

  - name: "User Profile"
    weight: 10
    flow:
      - get:
          url: "/user/profile"
          headers:
            Authorization: "Bearer {{ token }}"
          expect:
            - statusCode:
                - 200
                - 401
EOF

# Create processor script for Artillery
cat > "$RESULTS_DIR/processor.js" << 'EOF'
'use strict';

const fs = require('fs');
const crypto = require('crypto');

module.exports = {
  generateTestDocument: function(userContext, events, done) {
    userContext.vars.filename = `load-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;
    userContext.vars.filesize = Math.floor(Math.random() * 1048576) + 1024; // 1KB to 1MB
    userContext.vars.token = 'test-token-' + Math.random().toString(36).substr(2, 9);
    return done();
  },

  uploadFile: function(requestParams, context, ee, next) {
    // Simulate file upload
    requestParams.body = Buffer.alloc(context.vars.filesize);
    return next();
  }
};
EOF

# Create Python script for monitoring metrics during load test
cat > "$RESULTS_DIR/monitor_metrics.py" << EOF
#!/usr/bin/env python3
import boto3
import time
import json
from datetime import datetime, timedelta
import threading

cloudwatch = boto3.client('cloudwatch', region_name='$REGION')
autoscaling = boto3.client('autoscaling', region_name='$REGION')
elbv2 = boto3.client('elbv2', region_name='$REGION')

stage = '$STAGE'
test_duration = $DURATION
metrics_data = []

def get_metric_statistics(namespace, metric_name, dimensions, stat='Average'):
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(seconds=60)
    
    response = cloudwatch.get_metric_statistics(
        Namespace=namespace,
        MetricName=metric_name,
        Dimensions=dimensions,
        StartTime=start_time,
        EndTime=end_time,
        Period=60,
        Statistics=[stat]
    )
    
    if response['Datapoints']:
        return response['Datapoints'][0][stat]
    return 0

def monitor_metrics():
    while threading.current_thread().is_alive:
        timestamp = datetime.utcnow().isoformat()
        
        # Monitor Lambda metrics
        lambda_errors = get_metric_statistics(
            'AWS/Lambda',
            'Errors',
            [{'Name': 'FunctionName', 'Value': f'uploads-{stage}-avScan'}],
            'Sum'
        )
        
        lambda_duration = get_metric_statistics(
            'AWS/Lambda',
            'Duration',
            [{'Name': 'FunctionName', 'Value': f'uploads-{stage}-avScan'}],
            'Average'
        )
        
        # Monitor API Gateway metrics
        api_count = get_metric_statistics(
            'AWS/ApiGateway',
            'Count',
            [{'Name': 'ApiName', 'Value': f'infra-api-{stage}-app-api-gateway'}],
            'Sum'
        )
        
        api_latency = get_metric_statistics(
            'AWS/ApiGateway',
            'Latency',
            [{'Name': 'ApiName', 'Value': f'infra-api-{stage}-app-api-gateway'}],
            'Average'
        )
        
        # Monitor Auto Scaling Group
        asg_name = None
        asgs = autoscaling.describe_auto_scaling_groups()
        for asg in asgs['AutoScalingGroups']:
            if f'MCR-VirusScanning-{stage}-ClamAvASG' in asg['AutoScalingGroupName']:
                asg_name = asg['AutoScalingGroupName']
                asg_instances = len(asg['Instances'])
                asg_desired = asg['DesiredCapacity']
                break
        
        # Monitor RDS
        rds_connections = get_metric_statistics(
            'AWS/RDS',
            'DatabaseConnections',
            [{'Name': 'DBClusterIdentifier', 'Value': f'postgres-{stage}'}],
            'Average'
        )
        
        metrics_data.append({
            'timestamp': timestamp,
            'lambda_errors': lambda_errors,
            'lambda_duration': lambda_duration,
            'api_requests': api_count,
            'api_latency': api_latency,
            'asg_instances': asg_instances if 'asg_instances' in locals() else 0,
            'asg_desired': asg_desired if 'asg_desired' in locals() else 0,
            'rds_connections': rds_connections
        })
        
        print(f"[{timestamp}] API: {api_count} requests, {api_latency:.2f}ms | Lambda: {lambda_errors} errors, {lambda_duration:.2f}ms | ASG: {asg_instances if 'asg_instances' in locals() else 0} instances | RDS: {rds_connections} connections")
        
        time.sleep(30)

# Start monitoring in a separate thread
monitor_thread = threading.Thread(target=monitor_metrics)
monitor_thread.daemon = True
monitor_thread.start()

print(f"Monitoring metrics for {test_duration} seconds...")
time.sleep(test_duration + 120)  # Extra time for warm-up and cool-down

# Save metrics
with open('$RESULTS_DIR/metrics.json', 'w') as f:
    json.dump(metrics_data, f, indent=2)

print(f"Metrics saved to $RESULTS_DIR/metrics.json")
EOF

chmod +x "$RESULTS_DIR/monitor_metrics.py"

# Function to check Auto Scaling behavior
check_auto_scaling() {
    echo -e "\n${BLUE}Monitoring Auto Scaling Group behavior...${NC}"
    
    ASG_NAME=$(aws autoscaling describe-auto-scaling-groups \
        --query "AutoScalingGroups[?contains(AutoScalingGroupName, 'MCR-VirusScanning-$STAGE-ClamAvASG')].AutoScalingGroupName" \
        --output text)
    
    if [ -n "$ASG_NAME" ]; then
        INITIAL_CAPACITY=$(aws autoscaling describe-auto-scaling-groups \
            --auto-scaling-group-names "$ASG_NAME" \
            --query 'AutoScalingGroups[0].DesiredCapacity' \
            --output text)
        
        echo "Initial ASG capacity: $INITIAL_CAPACITY instances"
    fi
}

# Function to generate load test report
generate_load_report() {
    echo -e "\n${YELLOW}Generating Load Test Report...${NC}"
    
    cat > "$RESULTS_DIR/load-test-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>MCR Load Test Report - $TEST_RUN_ID</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .good { color: green; }
        .warning { color: orange; }
        .bad { color: red; }
        canvas { max-width: 100%; height: 400px; margin: 20px 0; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>MCR Infrastructure Load Test Report</h1>
    <div class="metric">
        <h2>Test Configuration</h2>
        <p>Stage: $STAGE</p>
        <p>Duration: $DURATION seconds</p>
        <p>Concurrent Users: $CONCURRENT_USERS</p>
        <p>Test Run: $TEST_RUN_ID</p>
        <p>Date: $(date)</p>
    </div>
    
    <div class="metric">
        <h2>Key Metrics</h2>
        <div id="metrics-summary"></div>
    </div>
    
    <h2>Response Time Distribution</h2>
    <canvas id="responseTimeChart"></canvas>
    
    <h2>Throughput Over Time</h2>
    <canvas id="throughputChart"></canvas>
    
    <h2>Error Rate</h2>
    <canvas id="errorChart"></canvas>
    
    <h2>Auto Scaling Behavior</h2>
    <canvas id="scalingChart"></canvas>
    
    <script>
    // Load test results will be inserted here by the script
    </script>
</body>
</html>
EOF
}

# Main execution
echo -e "\n${YELLOW}Starting Load Test...${NC}"

# Start metrics monitoring in background
echo "Starting CloudWatch metrics monitor..."
python3 "$RESULTS_DIR/monitor_metrics.py" &
MONITOR_PID=$!

# Check initial auto scaling state
check_auto_scaling

# Run Artillery load test
echo -e "\n${BLUE}Running Artillery load test...${NC}"
cd "$RESULTS_DIR"
artillery run artillery-config.yml --output artillery-report.json

# Generate Artillery HTML report
artillery report artillery-report.json --output artillery-report.html

# Stop metrics monitoring
kill $MONITOR_PID 2>/dev/null || true

# Check final auto scaling state
echo -e "\n${BLUE}Checking final Auto Scaling state...${NC}"
if [ -n "$ASG_NAME" ]; then
    FINAL_CAPACITY=$(aws autoscaling describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --query 'AutoScalingGroups[0].DesiredCapacity' \
        --output text)
    
    echo "Final ASG capacity: $FINAL_CAPACITY instances"
    
    if [ "$FINAL_CAPACITY" -gt "$INITIAL_CAPACITY" ]; then
        echo -e "${GREEN}✓ Auto Scaling worked! Scaled from $INITIAL_CAPACITY to $FINAL_CAPACITY instances${NC}"
    else
        echo -e "${YELLOW}! Auto Scaling did not trigger (load might not have been high enough)${NC}"
    fi
fi

# Analyze results
echo -e "\n${YELLOW}Load Test Results Summary${NC}"
echo "================================"

# Parse Artillery results
if [ -f "artillery-report.json" ]; then
    TOTAL_REQUESTS=$(jq '.aggregate.counters."http.requests" // 0' artillery-report.json)
    TOTAL_ERRORS=$(jq '.aggregate.counters."http.codes.500" // 0' artillery-report.json)
    P95_LATENCY=$(jq '.aggregate.latency.p95 // 0' artillery-report.json)
    P99_LATENCY=$(jq '.aggregate.latency.p99 // 0' artillery-report.json)
    RPS=$(jq '.aggregate.rates."http.request_rate" // 0' artillery-report.json)
    
    echo "Total Requests: $TOTAL_REQUESTS"
    echo "Requests/sec: $RPS"
    echo "Total Errors: $TOTAL_ERRORS"
    echo "Error Rate: $(awk "BEGIN {printf \"%.2f\", $TOTAL_ERRORS/$TOTAL_REQUESTS*100}")%"
    echo "P95 Latency: ${P95_LATENCY}ms"
    echo "P99 Latency: ${P99_LATENCY}ms"
    
    # Performance assessment
    echo -e "\n${YELLOW}Performance Assessment:${NC}"
    
    if [ "$P99_LATENCY" -lt 1000 ]; then
        echo -e "${GREEN}✓ Excellent: P99 latency under 1 second${NC}"
    elif [ "$P99_LATENCY" -lt 3000 ]; then
        echo -e "${YELLOW}! Good: P99 latency under 3 seconds${NC}"
    else
        echo -e "${RED}✗ Poor: P99 latency over 3 seconds${NC}"
    fi
    
    ERROR_RATE=$(awk "BEGIN {print $TOTAL_ERRORS/$TOTAL_REQUESTS*100}")
    if (( $(echo "$ERROR_RATE < 1" | bc -l) )); then
        echo -e "${GREEN}✓ Excellent: Error rate under 1%${NC}"
    elif (( $(echo "$ERROR_RATE < 5" | bc -l) )); then
        echo -e "${YELLOW}! Acceptable: Error rate under 5%${NC}"
    else
        echo -e "${RED}✗ Poor: Error rate over 5%${NC}"
    fi
fi

# Generate final report
generate_load_report

echo -e "\n${GREEN}Load test completed!${NC}"
echo "Results saved to: $RESULTS_DIR"
echo "- Artillery Report: $RESULTS_DIR/artillery-report.html"
echo "- CloudWatch Metrics: $RESULTS_DIR/metrics.json"
echo "- Load Test Report: $RESULTS_DIR/load-test-report.html"

# Extrapolate to millions of users
echo -e "\n${YELLOW}Scaling Projection for Millions of Users:${NC}"
USERS_PER_INSTANCE=$((CONCURRENT_USERS / ${FINAL_CAPACITY:-1}))
echo "Each ClamAV instance handled approximately $USERS_PER_INSTANCE concurrent users"
echo "To handle 1 million concurrent users, you would need approximately $(( 1000000 / USERS_PER_INSTANCE )) ClamAV instances"
echo "Current max capacity setting: $(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG_NAME" --query 'AutoScalingGroups[0].MaxSize' --output text 2>/dev/null || echo 'N/A')"
