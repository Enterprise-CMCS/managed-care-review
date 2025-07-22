#!/bin/bash

# Comprehensive Integration Testing Script for MCR CDK Infrastructure
# This script verifies that all components are working correctly together

set -e

STAGE=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
TEST_RUN_ID=$(date +%s)
TEST_RESULTS_DIR="./test-results-$TEST_RUN_ID"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

echo "🧪 MCR CDK Infrastructure Integration Tests"
echo "==========================================="
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "Test Run ID: $TEST_RUN_ID"
echo "Results Directory: $TEST_RESULTS_DIR"
echo ""

# Logging function
log_test() {
    local test_name=$1
    local status=$2
    local message=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "$timestamp | $test_name | $status | $message" >> "$TEST_RESULTS_DIR/test-results.log"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: $message"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name: $message"
        ((TESTS_FAILED++))
    fi
}

# Function to test Lambda invocation
test_lambda_function() {
    local function_name=$1
    local test_payload=$2
    local expected_status=${3:-200}
    
    echo -e "\n${BLUE}Testing Lambda: $function_name${NC}"
    
    # Create test payload file
    echo "$test_payload" > "$TEST_RESULTS_DIR/${function_name}-payload.json"
    
    # Invoke the function
    response=$(aws lambda invoke \
        --function-name "$function_name" \
        --payload file://"$TEST_RESULTS_DIR/${function_name}-payload.json" \
        --log-type Tail \
        "$TEST_RESULTS_DIR/${function_name}-response.json" 2>&1 || echo "FAILED")
    
    if [[ "$response" == *"FAILED"* ]]; then
        log_test "Lambda:$function_name" "FAIL" "Failed to invoke function"
        return 1
    fi
    
    # Check for errors in response
    if [ -f "$TEST_RESULTS_DIR/${function_name}-response.json" ]; then
        if grep -q '"errorMessage"' "$TEST_RESULTS_DIR/${function_name}-response.json"; then
            error_msg=$(jq -r '.errorMessage // "Unknown error"' "$TEST_RESULTS_DIR/${function_name}-response.json")
            log_test "Lambda:$function_name" "FAIL" "Function returned error: $error_msg"
            return 1
        else
            log_test "Lambda:$function_name" "PASS" "Function invoked successfully"
            return 0
        fi
    else
        log_test "Lambda:$function_name" "FAIL" "No response received"
        return 1
    fi
}

# Function to test S3 operations
test_s3_bucket() {
    local bucket_name=$1
    local test_file="test-$TEST_RUN_ID.txt"
    
    echo -e "\n${BLUE}Testing S3 Bucket: $bucket_name${NC}"
    
    # Create test file
    echo "Integration test file - $TEST_RUN_ID" > "$TEST_RESULTS_DIR/$test_file"
    
    # Upload test file
    if aws s3 cp "$TEST_RESULTS_DIR/$test_file" "s3://$bucket_name/$test_file" --sse AES256 2>/dev/null; then
        log_test "S3:$bucket_name:Upload" "PASS" "Successfully uploaded test file"
        
        # Download test file
        if aws s3 cp "s3://$bucket_name/$test_file" "$TEST_RESULTS_DIR/${test_file}.downloaded" 2>/dev/null; then
            log_test "S3:$bucket_name:Download" "PASS" "Successfully downloaded test file"
            
            # Verify content
            if diff "$TEST_RESULTS_DIR/$test_file" "$TEST_RESULTS_DIR/${test_file}.downloaded" > /dev/null; then
                log_test "S3:$bucket_name:Verify" "PASS" "File content verified"
            else
                log_test "S3:$bucket_name:Verify" "FAIL" "File content mismatch"
            fi
        else
            log_test "S3:$bucket_name:Download" "FAIL" "Failed to download test file"
        fi
        
        # Cleanup
        aws s3 rm "s3://$bucket_name/$test_file" 2>/dev/null || true
    else
        log_test "S3:$bucket_name:Upload" "FAIL" "Failed to upload test file"
    fi
}

# Function to test database connectivity
test_database_connection() {
    echo -e "\n${BLUE}Testing Database Connectivity${NC}"
    
    # Get secret ARN
    secret_arn=$(aws secretsmanager describe-secret \
        --secret-id "aurora_postgres_${STAGE}_master" \
        --query 'ARN' --output text 2>/dev/null)
    
    if [ -z "$secret_arn" ]; then
        log_test "Database:Secret" "FAIL" "Database secret not found"
        return 1
    fi
    
    log_test "Database:Secret" "PASS" "Database secret found"
    
    # Test database manager function
    db_test_payload='{
        "action": "testConnection",
        "secretArn": "'$secret_arn'"
    }'
    
    test_lambda_function "postgres-$STAGE-dbManager" "$db_test_payload"
}

# Function to test virus scanning pipeline
test_virus_scanning() {
    echo -e "\n${BLUE}Testing Virus Scanning Pipeline${NC}"
    
    # Check if ClamAV is healthy
    asg_name=$(aws autoscaling describe-auto-scaling-groups \
        --query "AutoScalingGroups[?contains(AutoScalingGroupName, 'MCR-VirusScanning-$STAGE-ClamAvASG')].AutoScalingGroupName" \
        --output text)
    
    if [ -n "$asg_name" ]; then
        healthy_instances=$(aws autoscaling describe-auto-scaling-groups \
            --auto-scaling-group-names "$asg_name" \
            --query 'AutoScalingGroups[0].Instances[?HealthStatus==`Healthy`] | length(@)' \
            --output text)
        
        if [ "$healthy_instances" -gt 0 ]; then
            log_test "VirusScan:ClamAV" "PASS" "$healthy_instances healthy instance(s) in ASG"
        else
            log_test "VirusScan:ClamAV" "FAIL" "No healthy instances in ASG"
            return 1
        fi
    else
        log_test "VirusScan:ClamAV" "FAIL" "Auto Scaling Group not found"
        return 1
    fi
    
    # Test virus scan by uploading a test file
    test_virus_file="eicar-test-$TEST_RUN_ID.txt"
    # EICAR test string (safe virus test file)
    echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > "$TEST_RESULTS_DIR/$test_virus_file"
    
    # Upload to uploads bucket (should trigger scan)
    bucket_name="uploads-$STAGE-uploads"
    if aws s3 cp "$TEST_RESULTS_DIR/$test_virus_file" "s3://$bucket_name/test/$test_virus_file" 2>/dev/null; then
        log_test "VirusScan:Upload" "PASS" "Test file uploaded to trigger scan"
        
        # Wait for scan to complete
        echo "  Waiting 10 seconds for virus scan to complete..."
        sleep 10
        
        # Check if file was quarantined (should be tagged or moved)
        tags=$(aws s3api get-object-tagging \
            --bucket "$bucket_name" \
            --key "test/$test_virus_file" \
            --query 'TagSet[?Key==`av-status`].Value' \
            --output text 2>/dev/null || echo "NONE")
        
        if [ "$tags" != "NONE" ]; then
            log_test "VirusScan:Process" "PASS" "File was scanned (status: $tags)"
        else
            log_test "VirusScan:Process" "WARN" "Could not verify scan status"
        fi
        
        # Cleanup
        aws s3 rm "s3://$bucket_name/test/$test_virus_file" 2>/dev/null || true
    else
        log_test "VirusScan:Upload" "FAIL" "Failed to upload test file"
    fi
}

# Function to test API Gateway
test_api_gateway() {
    echo -e "\n${BLUE}Testing API Gateway${NC}"
    
    # Get API Gateway URL
    api_id=$(aws apigateway get-rest-apis \
        --query "items[?name=='infra-api-$STAGE-app-api-gateway'].id" \
        --output text)
    
    if [ -z "$api_id" ]; then
        log_test "API:Gateway" "FAIL" "API Gateway not found"
        return 1
    fi
    
    api_url="https://$api_id.execute-api.$REGION.amazonaws.com/$STAGE"
    log_test "API:Gateway" "PASS" "API Gateway found: $api_url"
    
    # Test health endpoint (if exists)
    health_response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/health" || echo "000")
    
    if [ "$health_response" = "200" ] || [ "$health_response" = "403" ]; then
        log_test "API:Endpoint" "PASS" "API Gateway responding (HTTP $health_response)"
    else
        log_test "API:Endpoint" "FAIL" "API Gateway not responding (HTTP $health_response)"
    fi
}

# Function to test Cognito
test_cognito() {
    echo -e "\n${BLUE}Testing Cognito Authentication${NC}"
    
    # Get User Pool ID
    user_pool_id=$(aws cognito-idp list-user-pools \
        --max-results 60 \
        --query "UserPools[?contains(Name, 'mcr-$STAGE')].Id" \
        --output text | head -n1)
    
    if [ -z "$user_pool_id" ]; then
        log_test "Auth:UserPool" "FAIL" "Cognito User Pool not found"
        return 1
    fi
    
    log_test "Auth:UserPool" "PASS" "User Pool found: $user_pool_id"
    
    # Check app clients
    app_clients=$(aws cognito-idp list-user-pool-clients \
        --user-pool-id "$user_pool_id" \
        --query 'UserPoolClients | length(@)' \
        --output text)
    
    if [ "$app_clients" -gt 0 ]; then
        log_test "Auth:AppClients" "PASS" "$app_clients app client(s) configured"
    else
        log_test "Auth:AppClients" "FAIL" "No app clients found"
    fi
}

# Function to test secret rotation
test_secret_rotation() {
    echo -e "\n${BLUE}Testing Secret Rotation${NC}"
    
    # Check rotation configuration
    rotation_enabled=$(aws secretsmanager describe-secret \
        --secret-id "aurora_postgres_${STAGE}_master" \
        --query 'RotationEnabled' \
        --output text 2>/dev/null || echo "false")
    
    if [ "$rotation_enabled" = "true" ]; then
        log_test "Secrets:Rotation" "PASS" "Secret rotation is enabled"
        
        # Get rotation Lambda
        rotation_lambda=$(aws secretsmanager describe-secret \
            --secret-id "aurora_postgres_${STAGE}_master" \
            --query 'RotationRules.AutomaticallyAfterDays' \
            --output text 2>/dev/null || echo "0")
        
        if [ "$rotation_lambda" != "0" ]; then
            log_test "Secrets:Schedule" "PASS" "Rotation scheduled every $rotation_lambda days"
        else
            log_test "Secrets:Schedule" "FAIL" "Rotation schedule not configured"
        fi
    else
        if [ "$STAGE" = "ephemeral" ] || [ "$STAGE" = "dev" ]; then
            log_test "Secrets:Rotation" "PASS" "Rotation disabled for $STAGE (expected)"
        else
            log_test "Secrets:Rotation" "WARN" "Secret rotation not enabled"
        fi
    fi
}

# Function to test monitoring
test_monitoring() {
    echo -e "\n${BLUE}Testing Monitoring Configuration${NC}"
    
    # Check CloudWatch Log Groups
    log_groups=$(aws logs describe-log-groups \
        --log-group-name-prefix "/aws/lambda/" \
        --query "logGroups[?contains(logGroupName, '$STAGE')] | length(@)" \
        --output text)
    
    if [ "$log_groups" -gt 0 ]; then
        log_test "Monitoring:Logs" "PASS" "$log_groups CloudWatch Log Groups found"
    else
        log_test "Monitoring:Logs" "FAIL" "No CloudWatch Log Groups found"
    fi
    
    # Check if New Relic is configured (val/prod only)
    if [ "$STAGE" = "val" ] || [ "$STAGE" = "prod" ]; then
        nr_stream=$(aws cloudwatch describe-metric-streams \
            --names "NewRelic-Metric-Stream" \
            --query 'MetricStreams[0].State' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        if [ "$nr_stream" = "running" ]; then
            log_test "Monitoring:NewRelic" "PASS" "New Relic Metric Stream is running"
        else
            log_test "Monitoring:NewRelic" "FAIL" "New Relic Metric Stream not running"
        fi
    fi
}

# Function to test cross-service integration
test_integration_flow() {
    echo -e "\n${BLUE}Testing End-to-End Integration Flow${NC}"
    
    # Create a test document upload flow
    test_doc="integration-test-doc-$TEST_RUN_ID.pdf"
    echo "%PDF-1.4 Integration Test Document" > "$TEST_RESULTS_DIR/$test_doc"
    
    # Upload to uploads bucket
    bucket_name="uploads-$STAGE-uploads"
    upload_key="integration-test/$test_doc"
    
    if aws s3 cp "$TEST_RESULTS_DIR/$test_doc" "s3://$bucket_name/$upload_key" 2>/dev/null; then
        log_test "Integration:Upload" "PASS" "Document uploaded successfully"
        
        # Wait for processing
        echo "  Waiting 15 seconds for document processing..."
        sleep 15
        
        # Check if virus scan completed
        scan_status=$(aws s3api get-object-tagging \
            --bucket "$bucket_name" \
            --key "$upload_key" \
            --query 'TagSet[?Key==`av-status`].Value' \
            --output text 2>/dev/null || echo "NOT_SCANNED")
        
        if [ "$scan_status" = "CLEAN" ] || [ "$scan_status" = "INFECTED" ]; then
            log_test "Integration:VirusScan" "PASS" "Document scanned (status: $scan_status)"
        else
            log_test "Integration:VirusScan" "WARN" "Scan status unclear: $scan_status"
        fi
        
        # Cleanup
        aws s3 rm "s3://$bucket_name/$upload_key" 2>/dev/null || true
    else
        log_test "Integration:Upload" "FAIL" "Failed to upload document"
    fi
}

# Function to test database operations
test_database_operations() {
    echo -e "\n${BLUE}Testing Database Operations${NC}"
    
    # Test database export function
    export_payload='{
        "action": "export",
        "database": "test_db",
        "tables": ["test_table"]
    }'
    
    test_lambda_function "postgres-$STAGE-dbExport" "$export_payload"
    
    # Test database import function
    import_payload='{
        "action": "import",
        "database": "test_db",
        "s3Key": "test-import.sql"
    }'
    
    test_lambda_function "postgres-$STAGE-dbImport" "$import_payload"
}

# Function to generate test report
generate_report() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo "Integration Test Summary"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"
    echo ""
    echo "Detailed results saved to: $TEST_RESULTS_DIR/test-results.log"
    
    # Generate HTML report
    cat > "$TEST_RESULTS_DIR/report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>MCR Integration Test Report - $TEST_RUN_ID</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .summary { background: #f0f0f0; padding: 10px; margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
    </style>
</head>
<body>
    <h1>MCR Integration Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Test Run ID: $TEST_RUN_ID</p>
        <p>Stage: $STAGE</p>
        <p>Date: $(date)</p>
        <p>Total Tests: $((TESTS_PASSED + TESTS_FAILED))</p>
        <p class="pass">Passed: $TESTS_PASSED</p>
        <p class="fail">Failed: $TESTS_FAILED</p>
        <p>Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%</p>
    </div>
    <h2>Test Results</h2>
    <table>
        <tr><th>Timestamp</th><th>Test</th><th>Status</th><th>Message</th></tr>
EOF

    # Add test results to HTML
    while IFS='|' read -r timestamp test status message; do
        status_class=$([ "$status" = "PASS" ] && echo "pass" || echo "fail")
        echo "<tr><td>$timestamp</td><td>$test</td><td class='$status_class'>$status</td><td>$message</td></tr>" >> "$TEST_RESULTS_DIR/report.html"
    done < "$TEST_RESULTS_DIR/test-results.log"

    echo "</table></body></html>" >> "$TEST_RESULTS_DIR/report.html"
    echo "HTML report generated: $TEST_RESULTS_DIR/report.html"
}

# Main test execution
main() {
    echo "Starting integration tests..."
    
    # Core Infrastructure Tests
    echo -e "\n${YELLOW}=== Core Infrastructure Tests ===${NC}"
    test_database_connection
    test_s3_bucket "uploads-$STAGE-uploads"
    test_s3_bucket "uploads-$STAGE-qa"
    
    # Lambda Function Tests
    echo -e "\n${YELLOW}=== Lambda Function Tests ===${NC}"
    test_lambda_function "postgres-$STAGE-rotator" '{"Step": "testSecret"}'
    test_database_operations
    
    # Security Tests
    echo -e "\n${YELLOW}=== Security Tests ===${NC}"
    test_virus_scanning
    test_secret_rotation
    
    # API and Auth Tests
    echo -e "\n${YELLOW}=== API and Authentication Tests ===${NC}"
    test_api_gateway
    test_cognito
    
    # Monitoring Tests
    echo -e "\n${YELLOW}=== Monitoring Tests ===${NC}"
    test_monitoring
    
    # Integration Tests
    echo -e "\n${YELLOW}=== End-to-End Integration Tests ===${NC}"
    test_integration_flow
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! 🎉${NC}"
        exit 0
    else
        echo -e "\n${RED}Some tests failed. Please check the logs.${NC}"
        exit 1
    fi
}

# Run main function
main
