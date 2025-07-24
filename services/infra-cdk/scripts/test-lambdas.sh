#!/bin/bash

# Lambda Function & API Gateway Testing Script
# Tests all deployed Lambda functions and API Gateway endpoints with proper CDK naming conventions
# Usage: ./test-lambdas.sh [stage] [region]
# Environment: DEBUG=true ./test-lambdas.sh [stage] [region] (for detailed payload output)
# Environment: TEST_API_GW=false ./test-lambdas.sh [stage] [region] (to skip API Gateway tests)
# Environment: LOG_STREAMING=false ./test-lambdas.sh [stage] [region] (to disable log streaming)
# Environment: LOG_DURATION=10 ./test-lambdas.sh [stage] [region] (to change log streaming duration)

set -e

# Disable AWS CLI pager to prevent hanging on 'q' prompts
export AWS_PAGER=""

# Configuration
STAGE=${1:-dev}
REGION=${2:-us-east-1}
PROJECT_PREFIX="mcr"
TIMEOUT=30
DEBUG=${DEBUG:-false}
TEST_API_GW=${TEST_API_GW:-true}
LOG_STREAMING=${LOG_STREAMING:-true}
LOG_DURATION=${LOG_DURATION:-5}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
API_GW_TESTS=0
API_GW_PASSED=0
API_GW_FAILED=0

echo -e "${BLUE}🚀 Testing Lambda Functions for Stage: ${STAGE} in Region: ${REGION}${NC}"
echo "================================================================="

# Helper function to discover the actual log group name for a Lambda function
discover_log_group() {
    local function_name=$1
    
    # CDK creates log groups with "cdk-" prefix
    local cdk_log_group="/aws/lambda/cdk-${function_name}"
    local standard_log_group="/aws/lambda/${function_name}"
    
    # First try the CDK naming pattern (most likely for CDK-deployed functions)
    if aws logs describe-log-groups --log-group-name-prefix "${cdk_log_group}" --region "${REGION}" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "${cdk_log_group}"; then
        echo "${cdk_log_group}"
        return 0
    fi
    
    # Fallback to standard naming pattern (for compatibility)
    if aws logs describe-log-groups --log-group-name-prefix "${standard_log_group}" --region "${REGION}" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "${standard_log_group}"; then
        echo "${standard_log_group}"
        return 0
    fi
    
    # If neither pattern works, try to find any log group that contains the function name
    # This handles edge cases where naming might be different
    local partial_match
    partial_match=$(aws logs describe-log-groups --region "${REGION}" --query "logGroups[?contains(logGroupName, '${function_name}')].logGroupName" --output text 2>/dev/null | head -1)
    
    if [ -n "${partial_match}" ] && [ "${partial_match}" != "None" ]; then
        echo "${partial_match}"
        return 0
    fi
    
    # Return empty if no log group found
    echo ""
    return 1
}

# Helper function to stream logs for a Lambda function in real-time
stream_lambda_logs() {
    local function_name=$1
    local duration=${2:-${LOG_DURATION}}  # Use global setting or provided duration
    
    # Skip log streaming if disabled
    if [ "${LOG_STREAMING}" != "true" ]; then
        echo -e "\n${YELLOW}📋 Log streaming disabled${NC}"
        return 0
    fi
    
    echo -e "\n${BLUE}📋 Streaming Logs (${duration}s):${NC}"
    
    # Discover the actual log group name
    local log_group_name
    log_group_name=$(discover_log_group "${function_name}")
    
    if [ -z "${log_group_name}" ]; then
        echo -e "${YELLOW}  ⚠️  No log group found for: ${function_name}${NC}"
        echo -e "${YELLOW}  💡 Expected: /aws/lambda/cdk-${function_name} or /aws/lambda/${function_name}${NC}"
        return 0
    fi
    
    echo -e "${BLUE}  📍 Log Group: ${log_group_name}${NC}"
    
    # Stream logs with timeout, starting from 30 seconds ago to catch the invocation
    echo -e "${BLUE}  📡 Streaming logs...${NC}"
    
    # Use timeout to prevent hanging and capture logs from recent invocation
    # Disable pager and use timeout for clean termination
    export AWS_PAGER=""
    
    # Check if timeout command is available, fallback to gtimeout on macOS
    local timeout_cmd="timeout"
    if ! command -v timeout >/dev/null 2>&1; then
        if command -v gtimeout >/dev/null 2>&1; then
            timeout_cmd="gtimeout"
        else
            echo -e "${YELLOW}  ⚠️  timeout command not available, using background process with kill${NC}"
            # Fallback: run in background and kill after duration
            aws logs tail "${log_group_name}" \
                --region "${REGION}" \
                --since "30s" \
                --format short \
                --follow 2>/dev/null &
            local tail_pid=$!
            sleep "${duration}"
            kill "${tail_pid}" 2>/dev/null || true
            wait "${tail_pid}" 2>/dev/null || true
            echo -e "${BLUE}  ✅ Log streaming completed${NC}"
            return 0
        fi
    fi
    
    "${timeout_cmd}" "${duration}" aws logs tail "${log_group_name}" \
        --region "${REGION}" \
        --since "30s" \
        --format short \
        --follow 2>/dev/null | while IFS= read -r line; do
        
        # Skip empty lines
        [ -z "${line}" ] && continue
        
        # Extract timestamp and message from the 'short' format output
        # Format: YYYY-MM-DD HH:MM:SS UTC [RequestID] LOG_LEVEL message
        if [[ "${line}" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2}) ]]; then
            local timestamp="${BASH_REMATCH[1]}"
            local remainder="${line#*"${timestamp}"}"
            # Remove UTC and request ID parts to get to the actual message
            local message=$(echo "${remainder}" | sed -E 's/^[[:space:]]*UTC[[:space:]]*\[[^]]*\][[:space:]]*//')
            
            # Colorize based on log level
            if echo "${message}" | grep -qi "error\|exception\|failed\|fatal\|Extension\.Crash"; then
                echo -e "  ${RED}[ERROR]${NC} ${timestamp} ${message}"
            elif echo "${message}" | grep -qi "warn\|warning"; then
                echo -e "  ${YELLOW}[WARN]${NC} ${timestamp} ${message}"
            elif echo "${message}" | grep -qi "info\|start\|end\|request\|report"; then
                echo -e "  ${BLUE}[INFO]${NC} ${timestamp} ${message}"
            else
                echo -e "  ${NC}${timestamp} ${message}"
            fi
        else
            # Handle lines that don't match expected format
            if echo "${line}" | grep -qi "error\|exception\|failed\|fatal\|Extension\.Crash"; then
                echo -e "  ${RED}[ERROR]${NC} ${line}"
            else
                echo -e "  ${NC}${line}"
            fi
        fi
    done
    
    # Small delay to ensure timeout completes cleanly
    sleep 0.5
    echo -e "${BLUE}  ✅ Log streaming completed${NC}"
}

# Helper function to discover API Gateway URL
discover_api_gateway() {
    local api_name="${PROJECT_PREFIX}-${STAGE}-api"
    
    echo -e "${BLUE}🔍 Discovering API Gateway...${NC}"
    
    # Try to find API Gateway by name pattern
    local api_id=$(aws apigateway get-rest-apis --region "${REGION}" --query "items[?name=='${api_name}'].id" --output text 2>/dev/null)
    
    if [ -z "${api_id}" ] || [ "${api_id}" = "None" ]; then
        # Try alternative naming patterns
        api_id=$(aws apigateway get-rest-apis --region "${REGION}" --query "items[?contains(name, '${PROJECT_PREFIX}') && contains(name, '${STAGE}')].id" --output text 2>/dev/null | head -1)
    fi
    
    if [ -n "${api_id}" ] && [ "${api_id}" != "None" ]; then
        API_GW_URL="https://${api_id}.execute-api.${REGION}.amazonaws.com/${STAGE}"
        echo -e "${GREEN}✅ Found API Gateway: ${api_id}${NC}"
        echo -e "${BLUE}📍 API URL: ${API_GW_URL}${NC}"
        return 0
    else
        echo -e "${RED}❌ API Gateway not found${NC}"
        return 1
    fi
}

# Helper function to test API Gateway endpoint
test_api_endpoint() {
    local method=$1
    local path=$2
    local expected_status=$3
    local test_description=$4
    local auth_type=${5:-none}
    local request_body=${6:-}
    
    API_GW_TESTS=$((API_GW_TESTS + 1))
    
    echo -e "\n${YELLOW}Testing API: ${method} ${path}${NC}"
    echo "Description: ${test_description}"
    
    if [ -z "${API_GW_URL}" ]; then
        echo -e "${RED}❌ FAILED: API Gateway URL not available${NC}"
        API_GW_FAILED=$((API_GW_FAILED + 1))
        return 1
    fi
    
    local full_url="${API_GW_URL}${path}"
    local curl_args=("-s" "-w" "%{http_code}" "-o" "/tmp/api-response-${RANDOM}.json" "--max-time" "${TIMEOUT}")
    
    # Add method and body if specified
    if [ "${method}" != "GET" ]; then
        curl_args+=("-X" "${method}")
    fi
    
    if [ -n "${request_body}" ]; then
        curl_args+=("-H" "Content-Type: application/json" "-d" "${request_body}")
    fi
    
    # Add authentication based on type
    case "${auth_type}" in
        "iam")
            # Use AWS CLI credentials for IAM auth
            curl_args+=("-H" "Authorization: AWS4-HMAC-SHA256 Credential=test")
            ;;
        "bearer")
            # Add bearer token (would need real token in production)
            curl_args+=("-H" "Authorization: Bearer test-token")
            ;;
        "cognito")
            # Add Cognito token (would need real token in production)
            curl_args+=("-H" "Authorization: Bearer cognito-test-token")
            ;;
        *)
            # No auth
            ;;
    esac
    
    # Make the request
    local http_code
    http_code=$(curl "${curl_args[@]}" "${full_url}")
    local curl_exit_code=$?
    
    if [ ${curl_exit_code} -ne 0 ]; then
        echo -e "${RED}❌ FAILED: Request failed (curl exit code: ${curl_exit_code})${NC}"
        API_GW_FAILED=$((API_GW_FAILED + 1))
        return 1
    fi
    
    # Check status code
    if [ "${http_code}" = "${expected_status}" ]; then
        echo -e "${GREEN}✅ PASSED: HTTP ${http_code}${NC}"
        API_GW_PASSED=$((API_GW_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED: Expected ${expected_status}, got ${http_code}${NC}"
        API_GW_FAILED=$((API_GW_FAILED + 1))
        
        # Show response for debugging
        local response_file="/tmp/api-response-${RANDOM}.json"
        if [ -f "${response_file}" ]; then
            echo "Response (first 200 chars):"
            head -c 200 "${response_file}" 2>/dev/null || echo "Could not read response"
            rm -f "${response_file}"
        fi
    fi
    
    if [ "${DEBUG}" = "true" ]; then
        echo "Full URL: ${full_url}"
        echo "HTTP Code: ${http_code}"
        echo "Auth Type: ${auth_type}"
    fi
}

# Helper function to test a Lambda function
test_lambda() {
    local function_name=$1
    local test_payload=$2
    local expected_status_code=$3
    local test_description=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${YELLOW}Testing: ${function_name}${NC}"
    echo "Description: ${test_description}"
    
    # Check if function exists
    if ! aws lambda get-function --function-name "${function_name}" --region "${REGION}" &>/dev/null; then
        echo -e "${RED}❌ FAILED: Function ${function_name} not found${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Base64 encode the payload for AWS CLI (cross-platform compatible)
    local encoded_payload
    if [ -n "${test_payload}" ]; then
        encoded_payload=$(echo -n "${test_payload}" | base64)
        if [ "${DEBUG}" = "true" ]; then
            echo "Raw payload: ${test_payload}"
            echo "Encoded payload: ${encoded_payload}"
        fi
    else
        encoded_payload=""
    fi
    
    # Invoke the function
    local output_file="/tmp/lambda-test-output-${RANDOM}.json"
    local error_file="/tmp/lambda-test-error-${RANDOM}.json"
    
    local invoke_cmd="aws lambda invoke --function-name \"${function_name}\" --cli-read-timeout \"${TIMEOUT}\" --cli-connect-timeout \"${TIMEOUT}\" --region \"${REGION}\""
    
    if [ -n "${encoded_payload}" ]; then
        invoke_cmd="${invoke_cmd} --payload \"${encoded_payload}\""
    fi
    
    invoke_cmd="${invoke_cmd} \"${output_file}\""
    
    if eval "${invoke_cmd}" 2>"${error_file}"; then
        
        # Check status code if specified
        if [ -n "${expected_status_code}" ]; then
            local actual_status=$(jq -r '.StatusCode // empty' "${output_file}" 2>/dev/null || echo "")
            if [ "${actual_status}" = "${expected_status_code}" ]; then
                echo -e "${GREEN}✅ PASSED: Status code ${actual_status}${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}❌ FAILED: Expected status ${expected_status_code}, got ${actual_status}${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            echo -e "${GREEN}✅ PASSED: Function invoked successfully${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
        
        # Show response (truncated)
        echo "Response (first 200 chars):"
        if [ -f "${output_file}" ]; then
            cat "${output_file}" | head -c 200
            echo "..."
        fi
    else
        echo -e "${RED}❌ FAILED: Invocation failed${NC}"
        if [ -f "${error_file}" ]; then
            echo "Error:"
            cat "${error_file}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    # Give Lambda time to write logs, then stream them in real-time
    echo -e "${BLUE}  ⏳ Waiting for logs to be written...${NC}"
    sleep 2
    
    # Stream logs for debugging (5 seconds by default)
    stream_lambda_logs "${function_name}" 5
    
    # Cleanup
    rm -f "${output_file}" "${error_file}"
}

# Helper function to test with GraphQL payload
test_graphql() {
    local function_name=$1
    local query=$2
    local test_description=$3
    
    # Use compact JSON format - single line, properly escaped
    local graphql_payload="{\"httpMethod\":\"POST\",\"path\":\"/graphql\",\"headers\":{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer test-token\"},\"body\":\"{\\\"query\\\":\\\"${query}\\\"}\"}"
    
    test_lambda "${function_name}" "${graphql_payload}" "" "${test_description}"
}

# Helper function to test health check
test_health_check() {
    local function_name=$1
    
    # Use compact JSON format - single line
    local health_payload="{\"httpMethod\":\"GET\",\"path\":\"/health_check\",\"headers\":{\"Content-Type\":\"application/json\"}}"
    
    test_lambda "${function_name}" "${health_payload}" "" "Health check endpoint test"
}

echo -e "\n${BLUE}📋 API COMPUTE STACK FUNCTIONS${NC}"
echo "================================="

# Test API Compute Stack Lambda Functions
# Format: mcr-{stage}-app-api-{functionName}

test_graphql \
    "${PROJECT_PREFIX}-${STAGE}-app-api-graphql" \
    "{ __typename }" \
    "GraphQL introspection query"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-oauthToken" \
    '{"httpMethod":"POST","path":"/oauth/token","body":"{\"grant_type\":\"client_credentials\"}"}' \
    "" \
    "OAuth token endpoint test"

test_health_check \
    "${PROJECT_PREFIX}-${STAGE}-app-api-health"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-emailSubmit" \
    '{"Records":[{"eventSource":"test","eventName":"test"}]}' \
    "" \
    "Email submission test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-thirdPartyApiAuthorizer" \
    '{"type":"TOKEN","authorizationToken":"Bearer test-token","methodArn":"arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request"}' \
    "" \
    "Third party API authorizer test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-otel" \
    '{"httpMethod":"POST","path":"/otel","body":"{}"}' \
    "" \
    "OTEL endpoint test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-zipKeys" \
    '{"httpMethod":"POST","path":"/zip","body":"{\"keys\":[\"test-key\"]}"}' \
    "" \
    "Zip keys endpoint test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-cleanup" \
    '{"source":"aws.events","detail-type":"Scheduled Event"}' \
    "" \
    "Cleanup scheduled function test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-migrate" \
    '{"action":"migrate","dryRun":true}' \
    "" \
    "Database migration test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-migrateDocumentZips" \
    '{"action":"migrate","documentType":"zip"}' \
    "" \
    "Document ZIP migration test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-app-api-auditFiles" \
    '{"bucketName":"test-bucket","action":"audit"}' \
    "" \
    "File audit test"

echo -e "\n${BLUE}🗄️  DATABASE OPERATIONS STACK FUNCTIONS${NC}"
echo "========================================"

# Test Database Operations Stack Lambda Functions
# Format: mcr-{stage}-postgres-{functionName}

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-postgres-dbManager" \
    '{"action":"list","databaseType":"logical"}' \
    "" \
    "Database manager test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-postgres-dbExport" \
    '{"exportType":"full","dryRun":true}' \
    "" \
    "Database export test"

test_lambda \
    "${PROJECT_PREFIX}-${STAGE}-postgres-dbImport" \
    '{"importType":"incremental","dryRun":true}' \
    "" \
    "Database import test"

# API Gateway Testing Section
if [ "${TEST_API_GW}" = "true" ]; then
    echo -e "\n${BLUE}🌐 API GATEWAY ENDPOINT TESTS${NC}"
    echo "=================================="
    
    # Discover API Gateway URL
    if discover_api_gateway; then
        
        # Test public endpoints
        test_api_endpoint "GET" "/health_check" "200" "Health check endpoint (public)"
        
        test_api_endpoint "POST" "/oauth/token" "400" "OAuth token endpoint (public, expect 400 for invalid request)" "none" '{"grant_type":"client_credentials"}'
        
        test_api_endpoint "POST" "/otel" "200" "OTEL endpoint (public)" "none" '{}'
        
        # Test protected endpoints (expect 401/403 without proper auth)
        test_api_endpoint "POST" "/graphql" "403" "GraphQL endpoint (IAM auth required)" "iam" '{"query":"{ __typename }"}'
        
        test_api_endpoint "POST" "/zip" "401" "Zip download endpoint (Cognito auth required)" "cognito" '{"keys":["test"]}'
        
        # Test external GraphQL endpoints (custom authorizer)
        test_api_endpoint "GET" "/v1/graphql/external" "401" "External GraphQL GET (custom auth required)" "bearer"
        
        test_api_endpoint "POST" "/v1/graphql/external" "401" "External GraphQL POST (custom auth required)" "bearer" '{"query":"{ __typename }"}'
        
        # Test non-existent endpoints
        test_api_endpoint "GET" "/nonexistent" "404" "Non-existent endpoint (should return 404)"
        
        # Test CORS preflight (if configured)
        test_api_endpoint "OPTIONS" "/graphql" "200" "CORS preflight for GraphQL"
        
    else
        echo -e "${YELLOW}⚠️ Skipping API Gateway tests - API not found${NC}"
    fi
fi

echo -e "\n${BLUE}📊 TEST SUMMARY${NC}"
echo "================"
echo -e "Lambda Functions:"
echo -e "  Total Tests: ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "  ${RED}Failed: ${FAILED_TESTS}${NC}"

if [ "${TEST_API_GW}" = "true" ] && [ ${API_GW_TESTS} -gt 0 ]; then
    echo -e "\nAPI Gateway Endpoints:"
    echo -e "  Total Tests: ${API_GW_TESTS}"
    echo -e "  ${GREEN}Passed: ${API_GW_PASSED}${NC}"
    echo -e "  ${RED}Failed: ${API_GW_FAILED}${NC}"
fi

TOTAL_ALL_TESTS=$((TOTAL_TESTS + API_GW_TESTS))
TOTAL_ALL_PASSED=$((PASSED_TESTS + API_GW_PASSED))
TOTAL_ALL_FAILED=$((FAILED_TESTS + API_GW_FAILED))

echo -e "\nOverall Results:"
echo -e "  Total Tests: ${TOTAL_ALL_TESTS}"
echo -e "  ${GREEN}Passed: ${TOTAL_ALL_PASSED}${NC}"
echo -e "  ${RED}Failed: ${TOTAL_ALL_FAILED}${NC}"

if [ ${TOTAL_ALL_FAILED} -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi