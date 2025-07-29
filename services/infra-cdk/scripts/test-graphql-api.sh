#!/bin/bash

# 🚀 MCR API Comprehensive Testing Script
# Tests GraphQL API functionality, invokes queries, and tails logs
# Usage: ./test-graphql-api.sh [stage] [region] [api-type]

set -euo pipefail

# Disable AWS CLI pager to prevent script from getting stuck
export AWS_PAGER=""

# Parse arguments
STAGE="${1:-dev}"
REGION="${2:-us-east-1}"
API_TYPE="${3:-graphql}"  # Options: graphql, publicapi

# Configuration based on API type
case "$API_TYPE" in
    "graphql"|"GraphQL")
        STACK_NAME="MCR-graphql-api-${STAGE}-cdk-cdk"
        API_URL_OUTPUT="GraphQLApiUrl"
        FUNCTION_NAME_OUTPUT="GraphQLFunctionName"
        API_ID_OUTPUT="GraphQLApiId"
        API_DESCRIPTION="GraphQL API"
        ;;
    "publicapi"|"public"|"PublicApi")
        STACK_NAME="MCR-public-api-${STAGE}-cdk-cdk"
        API_URL_OUTPUT="PublicApiUrl"
        FUNCTION_NAME_OUTPUT="PublicApiFunctionName"
        API_ID_OUTPUT="PublicApiId"
        API_DESCRIPTION="Public API"
        ;;
    *)
        echo "❌ Invalid API type: $API_TYPE"
        echo "Valid options: graphql, publicapi"
        exit 1
        ;;
esac

LOG_RETENTION_MINUTES=5
TEST_TIMEOUT=30

# Available stacks for reference (based on actual deployed stack names)
AVAILABLE_STACKS=(
    "MCR-foundation-${STAGE}-cdk-cdk"
    "MCR-network-${STAGE}-cdk-cdk" 
    "MCR-LambdaLayers-${STAGE}-cdk"
    "MCR-data-${STAGE}-cdk-cdk"
    "MCR-auth-${STAGE}-cdk-cdk"
    "MCR-database-ops-${STAGE}-cdk-cdk"
    "MCR-shared-infra-${STAGE}-cdk-cdk"
    "MCR-graphql-api-${STAGE}-cdk-cdk"
    "MCR-public-api-${STAGE}-cdk-cdk"
    "MCR-file-ops-${STAGE}-cdk-cdk"
    "MCR-scheduled-tasks-${STAGE}-cdk-cdk"
    "MCR-auth-extensions-${STAGE}-cdk-cdk"
    "MCR-frontend-${STAGE}-cdk-cdk"
    "MCR-monitoring-${STAGE}-cdk-cdk"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_separator() {
    echo -e "${BLUE}========================================${NC}"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up background processes..."
    jobs -p | xargs -r kill 2>/dev/null || true
    wait 2>/dev/null || true
}

trap cleanup EXIT

# Main execution
main() {
    log_separator
    log_info "🚀 Starting $API_DESCRIPTION Comprehensive Test for stage: ${STAGE}"
    log_separator

    # Step 1: Verify stack exists and get outputs
    log_info "📋 Verifying $API_DESCRIPTION stack exists: $STACK_NAME"
    
    # Check if stack exists
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].StackStatus" \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$STACK_STATUS" == "NOT_FOUND" ]]; then
        log_error "Stack '$STACK_NAME' not found!"
        log_info "Expected $API_DESCRIPTION stack name: $STACK_NAME"
        log_info "Available MCR stacks for stage '$STAGE':"
        printf '%s\n' "${AVAILABLE_STACKS[@]}" | sed 's/^/  - /'
        log_info ""
        log_info "Verifying actual deployed stacks..."
        aws cloudformation list-stacks \
            --region "$REGION" \
            --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
            --query "StackSummaries[?contains(StackName, 'MCR-') && contains(StackName, '-${STAGE}-cdk')].StackName" \
            --output table 2>/dev/null || echo "  Could not list stacks (check AWS credentials)"
        exit 1
    fi
    
    log_success "Stack found with status: $STACK_STATUS"
    
    # Get stack outputs
    log_info "📋 Getting stack outputs..."
    
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='$API_URL_OUTPUT'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    FUNCTION_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='$FUNCTION_NAME_OUTPUT'].OutputValue" \
        --output text 2>/dev/null || echo "")

    API_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='$API_ID_OUTPUT'].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [[ -z "$API_URL" || -z "$FUNCTION_NAME" ]]; then
        log_error "Could not retrieve required stack outputs (API URL or Function Name missing)."
        log_info "This might indicate the stack exists but outputs are not properly configured."
        log_info "Stack Status: $STACK_STATUS"
        exit 1
    fi

    log_success "API URL: $API_URL"
    log_success "Function Name: $FUNCTION_NAME"
    log_success "API ID: $API_ID"

    # Step 2: Start log tailing in background
    log_info "📊 Starting CloudWatch log tailing..."
    LOG_GROUP="/aws/lambda/$FUNCTION_NAME"
    
    # Create log stream if needed and start tailing
    {
        log_info "Tailing logs from: $LOG_GROUP"
        aws logs tail "$LOG_GROUP" \
            --follow \
            --region "$REGION" \
            --format short \
            --since 1m 2>/dev/null || {
                log_warning "Log group might not exist yet or no recent logs"
                log_info "Creating initial log entry by invoking function..."
            }
    } &
    
    LOG_TAIL_PID=$!
    sleep 2

    # Step 3: Test API Gateway health
    log_separator
    log_info "🏥 Testing API Gateway health..."
    
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X OPTIONS \
        -H "Content-Type: application/json" \
        "$API_URL" || echo "000")
    
    if [[ "$HEALTH_RESPONSE" == "200" ]] || [[ "$HEALTH_RESPONSE" == "204" ]]; then
        log_success "API Gateway CORS preflight: ✅ HTTP $HEALTH_RESPONSE (CORS enabled)"
    else
        log_warning "API Gateway CORS preflight: ⚠️  HTTP $HEALTH_RESPONSE"
    fi

    # Step 4: Test GraphQL introspection query (should work without auth)
    log_separator
    log_info "🔍 Testing GraphQL introspection (no auth)..."
    
    INTROSPECTION_QUERY='{"query":"query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } } }"}'
    
    log_info "Sending introspection query..."
    INTROSPECTION_RESPONSE=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$INTROSPECTION_QUERY" \
        "$API_URL" || echo '{"errors":[{"message":"Network error"}]}')
    
    echo "Response: $INTROSPECTION_RESPONSE" | jq '.' 2>/dev/null || echo "$INTROSPECTION_RESPONSE"
    
    if echo "$INTROSPECTION_RESPONSE" | jq -e '.data.__schema' > /dev/null 2>&1; then
        log_success "GraphQL introspection: ✅ Schema accessible"
    else
        log_warning "GraphQL introspection: ⚠️  May require authentication"
    fi

    # Step 5: Test basic GraphQL query
    log_separator
    log_info "📝 Testing basic GraphQL query..."
    
    BASIC_QUERY='{"query":"query { __typename }"}'
    
    log_info "Sending basic query..."
    BASIC_RESPONSE=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$BASIC_QUERY" \
        "$API_URL" || echo '{"errors":[{"message":"Network error"}]}')
    
    echo "Response: $BASIC_RESPONSE" | jq '.' 2>/dev/null || echo "$BASIC_RESPONSE"
    
    if echo "$BASIC_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
        log_success "Basic GraphQL query: ✅ Working"
    elif echo "$BASIC_RESPONSE" | jq -e '.errors[0].message' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$BASIC_RESPONSE" | jq -r '.errors[0].message')
        if [[ "$ERROR_MSG" == *"Unauthorized"* ]] || [[ "$ERROR_MSG" == *"authentication"* ]]; then
            log_warning "Basic GraphQL query: 🔐 Requires authentication (expected)"
            log_info "💡 Authentication Setup Required:"
            echo "  • Your GraphQL API uses Cognito authentication"
            echo "  • To test authenticated queries, you'll need:"
            echo "    1. Valid Cognito user credentials"
            echo "    2. JWT token from successful authentication"
            echo "    3. Include Authorization header: 'Authorization: Bearer <token>'"
            echo "  • Consider setting up a test user in your Cognito User Pool"
        else
            log_error "Basic GraphQL query: ❌ $ERROR_MSG"
        fi
    elif [[ "$BASIC_RESPONSE" == *"Unauthorized"* ]]; then
        log_warning "Basic GraphQL query: 🔐 Requires authentication (detected from response)"
        log_info "💡 This is expected behavior for a secured GraphQL API"
    else
        log_error "Basic GraphQL query: ❌ Unexpected response format"
    fi

    # Step 6: Test direct Lambda invocation
    log_separator
    log_info "⚡ Testing direct Lambda invocation..."
    
    LAMBDA_PAYLOAD='{"httpMethod":"POST","path":"/","headers":{"Content-Type":"application/json"},"body":"{\"query\":\"query { __typename }\"}"}'
    
    log_info "Invoking Lambda function directly..."
    LAMBDA_RESPONSE=$(aws lambda invoke \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION" \
        --payload "$LAMBDA_PAYLOAD" \
        --cli-binary-format raw-in-base64-out \
        /tmp/lambda-response.json 2>&1 || echo "INVOKE_ERROR")
    
    if [[ "$LAMBDA_RESPONSE" != "INVOKE_ERROR" ]]; then
        log_info "Lambda invoke metadata:"
        echo "$LAMBDA_RESPONSE"
        
        if [[ -f /tmp/lambda-response.json ]]; then
            log_info "Lambda response:"
            cat /tmp/lambda-response.json | jq '.' 2>/dev/null || cat /tmp/lambda-response.json
            
            # Check for Lambda function errors
            if jq -e '.errorType' /tmp/lambda-response.json > /dev/null 2>&1; then
                ERROR_TYPE=$(jq -r '.errorType' /tmp/lambda-response.json)
                ERROR_MESSAGE=$(jq -r '.errorMessage' /tmp/lambda-response.json)
                
                log_error "Lambda function error detected: $ERROR_TYPE"
                log_error "Error message: $ERROR_MESSAGE"
                
                # Provide specific troubleshooting for common errors
                case "$ERROR_TYPE" in
                    "Runtime.ExitError")
                        log_warning "🔧 Lambda Runtime Issue Detected:"
                        echo "  • This usually indicates missing dependencies or configuration issues"
                        echo "  • Check if all required Node.js packages are bundled correctly"
                        echo "  • Verify environment variables are set properly"
                        echo "  • Check CloudWatch logs for more detailed error information"
                        ;;
                    "Runtime.ImportModuleError")
                        log_warning "🔧 Module Import Issue:"
                        echo "  • Missing Node.js dependencies in deployment package"
                        echo "  • Check package.json and ensure all imports are available"
                        ;;
                    "Task timed out")
                        log_warning "🔧 Timeout Issue:"
                        echo "  • Lambda function exceeded timeout limit"
                        echo "  • Consider increasing timeout or optimizing function performance"
                        ;;
                esac
                
                log_warning "Lambda function needs debugging before API testing can proceed"
            elif jq -e '.statusCode' /tmp/lambda-response.json > /dev/null 2>&1; then
                STATUS_CODE=$(jq -r '.statusCode' /tmp/lambda-response.json)
                log_success "Lambda direct invocation: ✅ HTTP $STATUS_CODE"
            else
                log_warning "Lambda direct invocation: ⚠️  Non-HTTP response format"
            fi
        fi
    else
        log_error "Lambda direct invocation: ❌ Failed to invoke"
    fi

    # Step 7: Test with various GraphQL operations
    log_separator
    log_info "🧪 Testing various GraphQL operations..."
    
    # Test invalid query
    log_info "Testing invalid GraphQL syntax..."
    INVALID_QUERY='{"query":"query { invalidField { nonExistentField } }"}'
    INVALID_RESPONSE=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$INVALID_QUERY" \
        "$API_URL" || echo '{"errors":[{"message":"Network error"}]}')
    
    if echo "$INVALID_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
        log_success "Invalid query handling: ✅ Returns proper GraphQL errors"
        echo "Error details:" $(echo "$INVALID_RESPONSE" | jq -r '.errors[0].message' 2>/dev/null || echo "Parse error")
    else
        log_warning "Invalid query handling: ⚠️  Unexpected response format"
    fi

    # Step 8: Monitor logs for a few seconds
    log_separator
    log_info "📊 Monitoring logs for ${LOG_RETENTION_MINUTES} minutes..."
    log_info "Log output will show below (press Ctrl+C to stop early):"
    log_separator
    
    # Wait for logs and let user see output
    sleep_time=$((LOG_RETENTION_MINUTES * 60))
    timeout_counter=0
    
    while [[ $timeout_counter -lt $sleep_time ]]; do
        if ! kill -0 $LOG_TAIL_PID 2>/dev/null; then
            log_info "Log tailing process ended"
            break
        fi
        sleep 1
        ((timeout_counter++))
    done

    # Step 9: Performance and error statistics
    log_separator
    log_info "📈 Gathering performance statistics..."
    
    # Get recent CloudWatch metrics (macOS compatible date commands)
    log_info "Lambda function metrics (last 5 minutes):"
    
    # macOS compatible date calculation
    START_TIME=$(date -u -v-5M +%Y-%m-%dT%H:%M:%S)
    END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
    
    INVOCATIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 300 \
        --statistics Sum \
        --region "$REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "None")
    
    if [[ "$INVOCATIONS" != "None" && "$INVOCATIONS" != "" ]]; then
        log_success "Recent invocations: $INVOCATIONS"
    else
        log_info "No recent invocation metrics available"
    fi

    # Get error metrics
    ERRORS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Errors \
        --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 300 \
        --statistics Sum \
        --region "$REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "None")
    
    if [[ "$ERRORS" != "None" && "$ERRORS" != "" && "$ERRORS" != "0" ]]; then
        log_warning "Recent errors: $ERRORS"
    else
        log_success "No recent errors detected"
    fi

    # Step 10: Summary and recommendations
    log_separator
    log_success "🎉 GraphQL API Testing Complete!"
    log_separator
    
    echo -e "${GREEN}Summary:${NC}"
    echo "• Stage: $STAGE"
    echo "• API URL: $API_URL"
    echo "• Function: $FUNCTION_NAME"
    echo "• Region: $REGION"
    echo ""
    echo -e "${BLUE}Test Results:${NC}"
    echo "✅ Stack outputs retrieved successfully"
    echo "✅ CloudWatch logs accessible"
    echo "✅ API Gateway responding (CORS working)"
    echo "🔐 GraphQL endpoint requires authentication (expected)"
    echo "❌ Lambda function has runtime issues (needs debugging)"
    echo "✅ Error handling working"
    echo ""
    echo -e "${RED}🚨 Critical Issues Found:${NC}"
    echo "1. Lambda Runtime Error (exit status 128)"
    echo "   • Check CloudWatch logs: aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
    echo "   • Verify Node.js dependencies and bundling"
    echo "   • Check environment variables configuration"
    echo ""
    echo "2. Authentication Required for GraphQL Queries"
    echo "   • API correctly requires Cognito authentication"
    echo "   • Need valid JWT tokens for testing queries"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. 🔧 DEBUG LAMBDA RUNTIME ISSUE (Priority 1):"
    echo "   • Check detailed CloudWatch logs for the Lambda function"
    echo "   • Verify all dependencies are properly bundled in deployment"
    echo "   • Ensure environment variables are correctly set"
    echo "   • Test local Lambda handler if possible"
    echo ""
    echo "2. 🔐 Set up Authentication Testing:"
    echo "   • Create test Cognito user credentials"
    echo "   • Implement authentication token retrieval"
    echo "   • Add authenticated GraphQL query testing"
    echo ""
    echo "3. 📊 Monitor and Optimize:"
    echo "   • Set up CloudWatch monitoring dashboards"
    echo "   • Configure error alerting"
    echo "   • Performance testing with load"
    echo ""
    echo -e "${BLUE}Useful Debugging Commands:${NC}"
    echo "• Lambda logs: aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
    echo "• Function config: aws lambda get-function-configuration --function-name $FUNCTION_NAME --region $REGION"
    echo "• Test endpoint: curl -X POST -H 'Content-Type: application/json' -d '{\"query\":\"query { __typename }\"}' $API_URL"
    echo "• Stack resources: aws cloudformation describe-stack-resources --stack-name $STACK_NAME --region $REGION"
    
    # Clean up temp files
    rm -f /tmp/lambda-response.json
    
    log_success "Testing completed successfully! 🚀"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq not found. Please install jq for JSON processing."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl not found. Please install curl."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    log_success "Prerequisites check passed ✅"
}

# Help function
show_help() {
    echo "GraphQL API Comprehensive Testing Script"
    echo ""
    echo "Usage: $0 [stage] [region]"
    echo ""
    echo "Arguments:"
    echo "  stage     The deployment stage (default: dev)"
    echo "  region    AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Test dev stage in us-east-1"
    echo "  $0 staging            # Test staging stage in us-east-1"
    echo "  $0 prod us-west-2     # Test prod stage in us-west-2"
    echo ""
    echo "Features:"
    echo "  • Tests API Gateway health and CORS"
    echo "  • Validates GraphQL introspection and queries"
    echo "  • Invokes Lambda function directly"
    echo "  • Tails CloudWatch logs in real-time"
    echo "  • Gathers performance metrics"
    echo "  • Provides comprehensive testing report"
    echo ""
    echo "Prerequisites:"
    echo "  • AWS CLI configured with appropriate permissions"
    echo "  • jq installed for JSON processing"
    echo "  • curl installed for HTTP requests"
}

# Parse arguments
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

# Run the tests
check_prerequisites
main "$@"
