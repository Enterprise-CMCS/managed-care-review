#!/bin/bash

# =============================================================================
# CDK-SPECIFIC Cypress Testing Script
# Tests application functionality against CDK-deployed infrastructure
# This is separate from serverless testing to avoid conflicts
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CYPRESS_DIR="${SCRIPT_DIR}/../cypress"
STAGE="dev"
REGION="${AWS_REGION:-us-east-1}"
TEST_MODE="smoke"
OPEN_MODE=false
VERBOSE=false
PARALLEL=false
COVERAGE=false
REPORT=false
TRACE=false
SPEC_PATTERN=""
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=300

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
START_TIME=$(date +%s)

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${WHITE}[$(date +'%H:%M:%S')]${NC} $1"
}

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
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_section() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

show_usage() {
    cat << EOF
${CYAN}CDK-Specific Cypress Testing Script${NC}

${WHITE}Usage:${NC}
    $0 [OPTIONS]

${WHITE}Test Modes:${NC}
    --full          Run complete test suite (all specs)
    --smoke         Run smoke tests only (default)
    --state         Run state workflow tests
    --cms           Run CMS workflow tests
    --admin         Run admin workflow tests
    --feature NAME  Run specific feature tests

${WHITE}Options:${NC}
    --open          Open Cypress UI (interactive mode)
    --parallel      Run tests in parallel (4 workers)
    --coverage      Generate coverage report
    --report        Generate comprehensive test report
    --verbose       Enable verbose output
    --trace         Enable Lambda tracing
    --spec PATTERN  Run specific spec pattern
    --retries N     Number of retries for flaky tests (default: 3)
    --help          Show this help message

${WHITE}Examples:${NC}
    $0 --full                           # Run all tests
    $0 --smoke --open                   # Open Cypress UI with smoke tests
    $0 --feature submissions --coverage # Test submissions with coverage
    $0 --spec "**/*forms*.spec.ts"     # Run specific spec pattern

${WHITE}Environment Variables:${NC}
    AWS_PROFILE     AWS profile to use
    AWS_REGION      AWS region (default: us-east-1)
    TEST_USERS_PASS Test users password (will prompt if not set)
    DEBUG           Enable debug output

EOF
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

check_prerequisites() {
    log_section "Pre-flight Checks"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 20+"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Please install: npm install -g pnpm"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run: aws configure"
        exit 1
    fi
    
    local identity=$(aws sts get-caller-identity --output json)
    local account=$(echo "$identity" | jq -r '.Account')
    local user=$(echo "$identity" | jq -r '.Arn' | awk -F'/' '{print $NF}')
    
    log_success "AWS Identity: $user (Account: $account)"
    
    # Check Cypress is installed
    if [ ! -d "$CYPRESS_DIR/node_modules" ]; then
        log_warning "Cypress dependencies not installed. Installing..."
        cd "$CYPRESS_DIR" && pnpm install
    fi
    
    log_success "All prerequisites met"
}

# =============================================================================
# CDK Stack Validation
# =============================================================================

validate_cdk_stacks() {
    log_section "Validating CDK Stacks"
    
    local required_stacks=(
        "MCR-Foundation-${STAGE}-cdk"
        "MCR-Network-${STAGE}-cdk"
        "MCR-Auth-${STAGE}-cdk"
        "MCR-Data-${STAGE}-cdk"
        "MCR-LambdaLayers-${STAGE}-cdk"
        "MCR-SharedInfra-${STAGE}-cdk"
        "MCR-GraphQLApi-${STAGE}-cdk"
        "MCR-PublicApi-${STAGE}-cdk"
        "MCR-FileOps-${STAGE}-cdk"
        "MCR-ScheduledTasks-${STAGE}-cdk"
        "MCR-DatabaseOperations-${STAGE}-cdk"
        "MCR-AuthExtensions-${STAGE}-cdk"
        "MCR-Frontend-${STAGE}-cdk"
    )
    
    local missing_stacks=()
    
    for stack in "${required_stacks[@]}"; do
        if aws cloudformation describe-stacks --stack-name "$stack" &> /dev/null; then
            log_success "✓ $stack"
        else
            log_error "✗ $stack not found"
            missing_stacks+=("$stack")
        fi
    done
    
    if [ ${#missing_stacks[@]} -gt 0 ]; then
        log_error "Missing CDK stacks. Please deploy first:"
        for stack in "${missing_stacks[@]}"; do
            echo "  - $stack"
        done
        exit 1
    fi
    
    log_success "All CDK stacks deployed"
}

# =============================================================================
# Fetch CDK Outputs
# =============================================================================

get_stack_output() {
    local stack=$1
    local output_key=$2
    aws cloudformation describe-stacks \
        --stack-name "$stack" \
        --query "Stacks[0].Outputs" \
        --output json 2>/dev/null | jq -r ".[] | select(.OutputKey==\"$output_key\") | .OutputValue" || echo ""
}

fetch_cdk_outputs() {
    log_section "Fetching CDK Outputs"
    
    # GraphQL API
    export VITE_APP_API_URL=$(get_stack_output "MCR-GraphQLApi-${STAGE}-cdk" "GraphQLApiUrl")
    export GRAPHQL_API_ID=$(get_stack_output "MCR-GraphQLApi-${STAGE}-cdk" "GraphQLApiId")
    
    # Authentication
    export COGNITO_USER_POOL_ID=$(get_stack_output "MCR-Auth-${STAGE}-cdk" "UserPoolId")
    export COGNITO_USER_POOL_WEB_CLIENT_ID=$(get_stack_output "MCR-Auth-${STAGE}-cdk" "UserPoolClientId")
    export COGNITO_IDENTITY_POOL_ID=$(get_stack_output "MCR-AuthExtensions-${STAGE}-cdk" "IdentityPoolId")
    export COGNITO_REGION=$REGION
    
    # S3 Buckets
    export VITE_APP_S3_DOCUMENTS_BUCKET=$(get_stack_output "MCR-Data-${STAGE}-cdk" "DocumentUploadsBucketName")
    export VITE_APP_S3_QA_BUCKET=$(get_stack_output "MCR-Data-${STAGE}-cdk" "QAUploadsBucketName")
    export VITE_APP_S3_REGION=$REGION
    
    # Frontend
    export APPLICATION_URL=$(get_stack_output "MCR-Frontend-${STAGE}-cdk" "ApplicationUrl")
    # Add Basic Auth credentials for non-prod environments
    # Default credentials from BasicAuthEdgeFunction: onemacuser:onemacpass
    local BASIC_AUTH_USER="${BASIC_AUTH_USER:-onemacuser}"
    local BASIC_AUTH_PASS="${BASIC_AUTH_PASS:-onemacpass}"
    # Strip https:// from APPLICATION_URL and add auth credentials
    local DOMAIN="${APPLICATION_URL#https://}"
    export CYPRESS_BASE_URL="https://${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}@${DOMAIN}"
    
    # OTEL (using same API Gateway as GraphQL)
    export VITE_APP_OTEL_COLLECTOR_URL="${VITE_APP_API_URL}otel"
    
    # Additional configs
    export VITE_APP_AUTH_MODE="AWS_COGNITO"
    export VITE_APP_STAGE_NAME=$STAGE
    export NODE_OPTIONS="--max_old_space_size=6000"
    
    # Validate required outputs
    if [ -z "$VITE_APP_API_URL" ]; then
        log_error "Failed to fetch API URL from CDK stack"
        exit 1
    fi
    
    if [ -z "$COGNITO_USER_POOL_ID" ]; then
        log_error "Failed to fetch Cognito User Pool ID"
        exit 1
    fi
    
    log_info "Configuration loaded:"
    log_info "  API URL: $VITE_APP_API_URL"
    log_info "  App URL: $CYPRESS_BASE_URL"
    log_info "  User Pool: $COGNITO_USER_POOL_ID"
    log_info "  Documents Bucket: $VITE_APP_S3_DOCUMENTS_BUCKET"
    log_info "  QA Bucket: $VITE_APP_S3_QA_BUCKET"
    
    if [ "$VERBOSE" = true ]; then
        log_info "  OTEL URL: $VITE_APP_OTEL_COLLECTOR_URL"
        log_info "  Identity Pool: $COGNITO_IDENTITY_POOL_ID"
        log_info "  API Gateway ID: $GRAPHQL_API_ID"
    fi
    
    log_success "CDK outputs fetched successfully"
}

# =============================================================================
# Lambda Validation
# =============================================================================

validate_lambdas() {
    log_section "Validating Lambda Functions"
    
    local lambda_functions=(
        "mcr-cdk-${STAGE}-graphql-api-graphql"
        "mcr-cdk-${STAGE}-graphql-api-authorizer"
        "mcr-cdk-${STAGE}-file-ops-audit-files"
        "mcr-cdk-${STAGE}-file-ops-zip-keys"
        "mcr-cdk-${STAGE}-scheduled-tasks-cleanup"
        "mcr-cdk-${STAGE}-scheduled-tasks-email-submit"
        "mcr-cdk-${STAGE}-postgres-migrate"
        "mcr-cdk-${STAGE}-postgres-migrate-document-zips"
        "mcr-cdk-${STAGE}-public-api-health"
        "mcr-cdk-${STAGE}-public-api-otel"
        "mcr-cdk-${STAGE}-public-api-oauth"
    )
    
    local failed_lambdas=()
    
    for lambda in "${lambda_functions[@]}"; do
        if aws lambda get-function --function-name "$lambda" &> /dev/null; then
            # Check function state
            local state=$(aws lambda get-function --function-name "$lambda" \
                --query 'Configuration.State' --output text)
            if [ "$state" = "Active" ]; then
                log_success "✓ $lambda (Active)"
            else
                log_warning "⚠ $lambda ($state)"
            fi
        else
            log_error "✗ $lambda not found"
            failed_lambdas+=("$lambda")
        fi
    done
    
    if [ ${#failed_lambdas[@]} -gt 0 ]; then
        log_error "Missing Lambda functions. Check deployment."
        exit 1
    fi
    
    log_success "All Lambda functions validated"
}

# =============================================================================
# Health Checks
# =============================================================================

health_check_endpoints() {
    log_section "Health Check - API Endpoints"
    
    local endpoints=(
        "${VITE_APP_API_URL}health_check|GraphQL Health"
        "${VITE_APP_OTEL_COLLECTOR_URL}|OTEL Collector"
    )
    
    local failed_checks=()
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS='|' read -r endpoint name <<< "$endpoint_info"
        
        log_info "Checking $name..."
        
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 10 \
            "$endpoint" 2>/dev/null || echo "000")
        
        if [[ "$response_code" =~ ^(200|401|403)$ ]]; then
            log_success "✓ $name responded ($response_code)"
        else
            log_error "✗ $name failed (HTTP $response_code)"
            failed_checks+=("$name")
        fi
    done
    
    # Check GraphQL introspection
    log_info "Checking GraphQL introspection..."
    local graphql_check=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"query":"{ __typename }"}' \
        "$VITE_APP_API_URL" 2>/dev/null || echo "")
    
    if [[ "$graphql_check" == *"__typename"* ]] || [[ "$graphql_check" == *"Unauthorized"* ]]; then
        log_success "✓ GraphQL endpoint responsive"
    else
        log_error "✗ GraphQL endpoint not responding correctly"
        failed_checks+=("GraphQL")
    fi
    
    if [ ${#failed_checks[@]} -gt 0 ]; then
        log_warning "Some health checks failed, but continuing..."
    else
        log_success "All endpoints healthy"
    fi
}

# =============================================================================
# Test User Management
# =============================================================================

ensure_test_users() {
    log_section "Ensuring Test Users Exist"
    
    # Get test password
    if [ -z "${TEST_USERS_PASS:-}" ]; then
        echo -n "Enter test users password: "
        read -s TEST_USERS_PASS
        echo
        export TEST_USERS_PASS
    fi
    
    # Check if test users exist
    local test_users=(
        "cypress-state-user@example.com"
        "cypress-cms-user@example.com"
        "cypress-cms-user-2@example.com"
        "cypress-admin-user@example.com"
    )
    
    for user in "${test_users[@]}"; do
        if aws cognito-idp admin-get-user \
            --user-pool-id "$COGNITO_USER_POOL_ID" \
            --username "$user" &> /dev/null; then
            log_success "✓ Test user exists: $user"
        else
            log_warning "Creating test user: $user"
            # Use the existing script to create users
            (cd "${SCRIPT_DIR}/../../scripts" && \
             pnpm tsc && \
             node ./add_cypress_test_users.js "$STAGE" "$TEST_USERS_PASS")
            break
        fi
    done
    
    log_success "Test users ready"
}

# =============================================================================
# Database Validation
# =============================================================================

validate_database() {
    log_section "Validating Database"
    
    # Get database cluster info
    local cluster_id="mcr-cdk-${STAGE}-database-cluster-cdk"
    
    if aws rds describe-db-clusters --db-cluster-identifier "$cluster_id" &> /dev/null; then
        local status=$(aws rds describe-db-clusters \
            --db-cluster-identifier "$cluster_id" \
            --query 'DBClusters[0].Status' --output text)
        
        if [ "$status" = "available" ]; then
            log_success "✓ Database cluster available"
        else
            log_warning "⚠ Database cluster status: $status"
        fi
        
        # Check if migrations have run
        log_info "Checking migration status..."
        local migrate_function="mcr-cdk-${STAGE}-postgres-migrate"
        
        # Invoke migrate function with status check
        local migration_result=$(aws lambda invoke \
            --function-name "$migrate_function" \
            --payload '{"action":"status"}' \
            /tmp/migrate-status.json 2>/dev/null && cat /tmp/migrate-status.json)
        
        if [[ "$migration_result" == *"up to date"* ]] || [[ "$migration_result" == *"success"* ]]; then
            log_success "✓ Database migrations up to date"
        else
            log_warning "Database migration status unclear, may need migration"
        fi
    else
        log_error "Database cluster not found"
        exit 1
    fi
}

# =============================================================================
# S3 Bucket Validation
# =============================================================================

validate_s3_buckets() {
    log_section "Validating S3 Buckets"
    
    # Check documents bucket
    if aws s3api head-bucket --bucket "$VITE_APP_S3_DOCUMENTS_BUCKET" 2>/dev/null; then
        log_success "✓ Documents bucket: $VITE_APP_S3_DOCUMENTS_BUCKET"
        
        # Check versioning
        local versioning=$(aws s3api get-bucket-versioning \
            --bucket "$VITE_APP_S3_DOCUMENTS_BUCKET" \
            --query 'Status' --output text)
        if [ "$versioning" = "Enabled" ]; then
            log_success "  ✓ Versioning enabled"
        else
            log_warning "  ⚠ Versioning not enabled"
        fi
    else
        log_error "✗ Documents bucket not accessible"
        exit 1
    fi
    
    # Check QA bucket
    if aws s3api head-bucket --bucket "$VITE_APP_S3_QA_BUCKET" 2>/dev/null; then
        log_success "✓ QA bucket: $VITE_APP_S3_QA_BUCKET"
    else
        log_error "✗ QA bucket not accessible"
        exit 1
    fi
    
    log_success "S3 buckets validated"
}

# =============================================================================
# Test Execution
# =============================================================================

get_spec_pattern() {
    case "$TEST_MODE" in
        "full")
            echo "integration/**/*.spec.ts"
            ;;
        "smoke")
            echo "integration/smokeTest/*.spec.ts"
            ;;
        "state")
            echo "integration/stateWorkflow/**/*.spec.ts"
            ;;
        "cms")
            echo "integration/cmsWorkflow/**/*.spec.ts"
            ;;
        "admin")
            echo "integration/adminWorkflow/**/*.spec.ts"
            ;;
        "feature")
            echo "integration/**/*${SPEC_PATTERN}*.spec.ts"
            ;;
        *)
            echo "$SPEC_PATTERN"
            ;;
    esac
}

run_cypress_tests() {
    log_section "Running Cypress Tests (CDK)"
    
    cd "$CYPRESS_DIR"
    
    # Build packages if needed
    if [ ! -d "../app-web/build" ]; then
        log_info "Building packages..."
        (cd ../.. && pnpm build:packages)
    fi
    
    # Generate code if needed
    if [ ! -d "./gen" ] || [ ! -d "../app-web/src/gen" ]; then
        log_info "Generating GraphQL code..."
        (cd ../.. && pnpm -r generate)
    fi
    
    local spec_pattern=$(get_spec_pattern)
    log_info "Test pattern: $spec_pattern"
    
    # Validate critical environment variables for CDK
    local missing_vars=()
    [ -z "$VITE_APP_AUTH_MODE" ] && missing_vars+=("VITE_APP_AUTH_MODE")
    [ -z "$TEST_USERS_PASS" ] && missing_vars+=("TEST_USERS_PASS")
    [ -z "$VITE_APP_API_URL" ] && missing_vars+=("VITE_APP_API_URL")
    [ -z "$COGNITO_USER_POOL_ID" ] && missing_vars+=("COGNITO_USER_POOL_ID")
    [ -z "$COGNITO_REGION" ] && missing_vars+=("COGNITO_REGION")
    [ -z "$COGNITO_IDENTITY_POOL_ID" ] && missing_vars+=("COGNITO_IDENTITY_POOL_ID")
    [ -z "$COGNITO_USER_POOL_WEB_CLIENT_ID" ] && missing_vars+=("COGNITO_USER_POOL_WEB_CLIENT_ID")
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables for CDK:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
    
    # Cypress command construction
    local cypress_cmd="pnpm cypress"
    
    if [ "$OPEN_MODE" = true ]; then
        cypress_cmd="$cypress_cmd open"
    else
        cypress_cmd="$cypress_cmd run"
        
        # Add headless options
        cypress_cmd="$cypress_cmd --headless --browser chrome"
        
        # Add spec pattern
        cypress_cmd="$cypress_cmd --spec \"$spec_pattern\""
        
        # Add coverage if requested
        if [ "$COVERAGE" = true ]; then
            export CYPRESS_COVERAGE=true
            export NODE_V8_COVERAGE=./coverage-cypress
        fi
        
        # Add retries
        cypress_cmd="$cypress_cmd --config retries={\"runMode\":$MAX_RETRIES,\"openMode\":0}"
        
        # Add parallel execution if requested
        if [ "$PARALLEL" = true ]; then
            cypress_cmd="$cypress_cmd --record --parallel --ci-build-id local-$(date +%s)"
            log_warning "Note: Parallel execution requires Cypress Dashboard configuration"
        fi
    fi
    
    # Add environment overrides
    cypress_cmd="$cypress_cmd --config baseUrl=$CYPRESS_BASE_URL"
    
    # CRITICAL FOR CDK: Pass environment variables directly to Cypress via --env flag
    # This ensures Cypress receives them regardless of subprocess environment inheritance
    cypress_cmd="$cypress_cmd --env AUTH_MODE=$VITE_APP_AUTH_MODE,TEST_USERS_PASS=$TEST_USERS_PASS"
    cypress_cmd="$cypress_cmd --env API_URL=$VITE_APP_API_URL"
    cypress_cmd="$cypress_cmd --env COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID"
    cypress_cmd="$cypress_cmd --env COGNITO_REGION=$COGNITO_REGION"
    cypress_cmd="$cypress_cmd --env COGNITO_IDENTITY_POOL_ID=$COGNITO_IDENTITY_POOL_ID"
    cypress_cmd="$cypress_cmd --env COGNITO_USER_POOL_WEB_CLIENT_ID=$COGNITO_USER_POOL_WEB_CLIENT_ID"
    
    # Pass AWS credentials if available
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
        cypress_cmd="$cypress_cmd --env AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
    fi
    if [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        cypress_cmd="$cypress_cmd --env AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
    fi
    if [ -n "${AWS_SESSION_TOKEN:-}" ]; then
        cypress_cmd="$cypress_cmd --env AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN"
    fi
    
    # Enable verbose output if requested
    if [ "$VERBOSE" = true ]; then
        export DEBUG="cypress:*"
        # Log environment variables for debugging (mask sensitive values)
        log_info "CDK Environment variables for Cypress:"
        log_info "  VITE_APP_AUTH_MODE: $VITE_APP_AUTH_MODE"
        log_info "  VITE_APP_API_URL: $VITE_APP_API_URL"
        log_info "  COGNITO_USER_POOL_ID: $COGNITO_USER_POOL_ID"
        log_info "  COGNITO_REGION: $COGNITO_REGION"
        log_info "  COGNITO_IDENTITY_POOL_ID: ${COGNITO_IDENTITY_POOL_ID:0:10}..."
        log_info "  COGNITO_USER_POOL_WEB_CLIENT_ID: ${COGNITO_USER_POOL_WEB_CLIENT_ID:0:10}..."
        log_info "  TEST_USERS_PASS: [MASKED]"
        log_info "  CYPRESS_BASE_URL: ${CYPRESS_BASE_URL%%:*}:[MASKED]@${CYPRESS_BASE_URL#*@}"
    fi
    
    # Enable tracing if requested
    if [ "$TRACE" = true ]; then
        export AWS_XRAY_CONTEXT_MISSING=LOG_ERROR
        export _X_AMZN_TRACE_ID=Root=1-$(printf '%x' $(date +%s))-$(openssl rand -hex 12)
    fi
    
    log_info "Starting Cypress for CDK..."
    log_info "Command: $cypress_cmd"
    
    # Run tests
    if eval "$cypress_cmd"; then
        log_success "Cypress tests completed successfully"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "Cypress tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        # Save artifacts
        if [ "$OPEN_MODE" = false ]; then
            local timestamp=$(date +%Y%m%d_%H%M%S)
            local artifacts_dir="${SCRIPT_DIR}/test-artifacts/${timestamp}"
            mkdir -p "$artifacts_dir"
            
            # Copy screenshots and videos
            [ -d "./screenshots" ] && cp -r ./screenshots "$artifacts_dir/"
            [ -d "./videos" ] && cp -r ./videos "$artifacts_dir/"
            
            log_info "Test artifacts saved to: $artifacts_dir"
        fi
    fi
}

# =============================================================================
# Lambda Invocation Tests
# =============================================================================

test_lambda_invocations() {
    log_section "Testing Lambda Direct Invocations"
    
    local test_payloads=(
        "mcr-cdk-${STAGE}-public-api-health|{\"httpMethod\":\"GET\",\"path\":\"/health\"}|Health check"
        "mcr-cdk-${STAGE}-graphql-api-graphql|{\"httpMethod\":\"POST\",\"path\":\"/graphql\",\"body\":\"{\\\"query\\\":\\\"{ __typename }\\\"}\"}|GraphQL introspection"
    )
    
    for test_info in "${test_payloads[@]}"; do
        IFS='|' read -r function_name payload description <<< "$test_info"
        
        log_info "Testing: $description"
        
        local response=$(aws lambda invoke \
            --function-name "$function_name" \
            --payload "$payload" \
            /tmp/lambda-response.json 2>&1)
        
        if [ $? -eq 0 ]; then
            local status_code=$(cat /tmp/lambda-response.json | jq -r '.statusCode // 0')
            if [[ "$status_code" =~ ^(200|401)$ ]]; then
                log_success "✓ $description (Status: $status_code)"
            else
                log_warning "⚠ $description (Status: $status_code)"
            fi
        else
            log_error "✗ $description failed"
        fi
    done
}

# =============================================================================
# Reporting
# =============================================================================

generate_report() {
    log_section "Test Report"
    
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo -e "${WHITE}Test Execution Summary${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Environment:     ${CYAN}$STAGE${NC}"
    echo -e "Test Mode:       ${CYAN}$TEST_MODE${NC}"
    echo -e "Duration:        ${CYAN}${minutes}m ${seconds}s${NC}"
    echo -e ""
    echo -e "Results:"
    echo -e "  ${GREEN}Passed:${NC}  $PASSED_TESTS"
    echo -e "  ${RED}Failed:${NC}  $FAILED_TESTS"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED_TESTS"
    echo -e ""
    
    if [ "$COVERAGE" = true ] && [ -f "./coverage-cypress/coverage-final.json" ]; then
        echo -e "${WHITE}Coverage Report:${NC}"
        npx c8 report --reporter=text-summary
    fi
    
    if [ "$REPORT" = true ]; then
        local report_file="${SCRIPT_DIR}/test-report-$(date +%Y%m%d_%H%M%S).json"
        cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$STAGE",
  "testMode": "$TEST_MODE",
  "duration": $duration,
  "results": {
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS
  },
  "configuration": {
    "apiUrl": "$VITE_APP_API_URL",
    "appUrl": "$CYPRESS_BASE_URL",
    "userPoolId": "$COGNITO_USER_POOL_ID"
  }
}
EOF
        log_info "Report saved to: $report_file"
    fi
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --full)
                TEST_MODE="full"
                shift
                ;;
            --smoke)
                TEST_MODE="smoke"
                shift
                ;;
            --state)
                TEST_MODE="state"
                shift
                ;;
            --cms)
                TEST_MODE="cms"
                shift
                ;;
            --admin)
                TEST_MODE="admin"
                shift
                ;;
            --feature)
                TEST_MODE="feature"
                SPEC_PATTERN="$2"
                shift 2
                ;;
            --open)
                OPEN_MODE=true
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --coverage)
                COVERAGE=true
                shift
                ;;
            --report)
                REPORT=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --trace)
                TRACE=true
                shift
                ;;
            --spec)
                SPEC_PATTERN="$2"
                shift 2
                ;;
            --retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_section "CDK-SPECIFIC Cypress Testing - Dev Environment"
    log_info "Test Mode: $TEST_MODE"
    log_info "Region: $REGION"
    log_warning "Using CDK-specific test script with direct environment variable passing"
    
    # Run all validation and tests
    check_prerequisites
    validate_cdk_stacks
    fetch_cdk_outputs
    validate_lambdas
    validate_database
    validate_s3_buckets
    health_check_endpoints
    ensure_test_users
    
    # Additional Lambda tests if verbose
    if [ "$VERBOSE" = true ]; then
        test_lambda_invocations
    fi
    
    # Run Cypress tests
    run_cypress_tests
    
    # Generate report
    generate_report
    
    log_success "Testing complete!"
}

# Execute main function
main "$@"