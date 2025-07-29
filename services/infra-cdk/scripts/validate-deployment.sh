#!/bin/bash

# End-to-End CDK Deployment Validation
# Comprehensive validation of CDK migration from serverless

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
STAGE=${STAGE:-dev}
REGION=${AWS_REGION:-us-east-1}
VERBOSE=${VERBOSE:-false}

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Arrays to store results
declare -a FAILURES=()
declare -a WARNINGS_LIST=()

echo "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${PURPLE}                    CDK DEPLOYMENT END-TO-END VALIDATION                       ${NC}"
echo "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Stage: ${CYAN}${STAGE}${NC}"
echo "Region: ${CYAN}${REGION}${NC}"
echo "Time: $(date)"
echo ""

# Helper functions
log_test() {
    ((TOTAL_TESTS++))
    echo -n "  Testing $1... "
}

log_pass() {
    echo "${GREEN}✓${NC}"
    ((PASSED_TESTS++))
    [[ "$VERBOSE" == "true" ]] && echo "    Details: $1"
}

log_fail() {
    echo "${RED}✗${NC}"
    ((FAILED_TESTS++))
    FAILURES+=("$1")
    [[ "$VERBOSE" == "true" ]] && echo "    Error: $1"
}

log_warn() {
    echo "${YELLOW}⚠${NC}"
    ((WARNINGS++))
    WARNINGS_LIST+=("$1")
    [[ "$VERBOSE" == "true" ]] && echo "    Warning: $1"
}

section_header() {
    echo ""
    echo "${BLUE}▶ $1${NC}"
    echo "${BLUE}$(printf '%.0s─' {1..80})${NC}"
}

# Check prerequisites
check_prerequisites() {
    section_header "Prerequisites Check"
    
    log_test "AWS CLI"
    if command -v aws >/dev/null 2>&1; then
        log_pass "$(aws --version)"
    else
        log_fail "AWS CLI not installed"
        echo "${RED}Please install AWS CLI to continue${NC}"
        exit 1
    fi
    
    log_test "AWS Credentials"
    if aws sts get-caller-identity >/dev/null 2>&1; then
        identity=$(aws sts get-caller-identity --query 'Arn' --output text)
        log_pass "$identity"
    else
        log_fail "AWS credentials not configured"
        exit 1
    fi
    
    log_test "jq (JSON processor)"
    if command -v jq >/dev/null 2>&1; then
        log_pass "$(jq --version)"
    else
        log_fail "jq not installed"
        exit 1
    fi
}

# Validate Lambda Functions
validate_lambda_functions() {
    section_header "Lambda Functions"
    
    # Map of expected functions (serverless name -> CDK name)
    declare -A lambda_functions=(
        ["emailSubmit"]="Email submission handler"
        ["oauthToken"]="OAuth token endpoint"
        ["health"]="Health check endpoint"
        ["thirdPartyApiAuthorizer"]="API Gateway authorizer"
        ["otel"]="OpenTelemetry collector proxy"
        ["graphql"]="GraphQL API handler"
        ["migrate"]="Database migration runner"
        ["migrateDocumentZips"]="Document ZIP migration"
        ["zipKeys"]="Bulk download handler"
        ["cleanup"]="Scheduled cleanup task"
        ["auditFiles"]="S3 audit function"
        ["dbManager"]="Logical database manager"
        ["dbExport"]="Database export handler"
        ["dbImport"]="Database import handler"
    )
    
    local lambda_count=0
    
    for func_name in "${!lambda_functions[@]}"; do
        description="${lambda_functions[$func_name]}"
        cdk_function_name="MCR-${func_name}-${STAGE}-cdk"
        
        log_test "$func_name"
        
        if aws lambda get-function --function-name "$cdk_function_name" >/dev/null 2>&1; then
            ((lambda_count++))
            
            # Get configuration
            config=$(aws lambda get-function-configuration --function-name "$cdk_function_name" 2>/dev/null)
            runtime=$(echo "$config" | jq -r '.Runtime')
            timeout=$(echo "$config" | jq -r '.Timeout')
            memory=$(echo "$config" | jq -r '.MemorySize')
            layers=$(echo "$config" | jq -r '.Layers | length')
            
            # Validate runtime
            if [[ "$runtime" == "nodejs20.x" ]]; then
                log_pass "Runtime: $runtime, Memory: ${memory}MB, Timeout: ${timeout}s, Layers: $layers"
            else
                log_fail "Wrong runtime: $runtime (expected nodejs20.x)"
            fi
            
            # Test invocation for specific functions
            if [[ "$func_name" == "health" ]]; then
                echo -n "    Invoking health check... "
                response=$(aws lambda invoke \
                    --function-name "$cdk_function_name" \
                    --payload '{"httpMethod":"GET","path":"/health"}' \
                    /tmp/health-response.json 2>&1)
                
                if [[ $? -eq 0 ]] && grep -q "200" /tmp/health-response.json 2>/dev/null; then
                    echo "${GREEN}✓${NC}"
                else
                    echo "${RED}✗${NC}"
                fi
                rm -f /tmp/health-response.json
            fi
        else
            log_fail "$description not found"
        fi
    done
    
    echo ""
    echo "  Total Lambda functions found: ${lambda_count}/${#lambda_functions[@]}"
}

# Validate API Gateways
validate_api_gateways() {
    section_header "API Gateway Endpoints"
    
    # Expected API Gateways from micro-stack architecture
    declare -A expected_apis=(
        ["GraphQLApi"]="GraphQL API endpoint"
        ["PublicApi"]="REST API endpoints (health, otel)"
    )
    
    local api_count=0
    local total_endpoints=0
    
    # Get all CDK API Gateways
    apis=$(aws apigateway get-rest-apis --query "items[?contains(name, 'MCR-') && contains(name, '-${STAGE}-cdk')]" --output json 2>/dev/null || echo "[]")
    
    for api_name in "${!expected_apis[@]}"; do
        description="${expected_apis[$api_name]}"
        
        log_test "$api_name"
        
        api_match=$(echo "$apis" | jq -r ".[] | select(.name | contains(\"$api_name\")) | .id" | head -1)
        
        if [[ -n "$api_match" && "$api_match" != "null" ]]; then
            ((api_count++))
            
            # Count endpoints
            resources=$(aws apigateway get-resources --rest-api-id "$api_match" --query 'items[?resourceMethods != null]' --output json 2>/dev/null || echo "[]")
            endpoint_count=$(echo "$resources" | jq 'length')
            ((total_endpoints += endpoint_count))
            
            log_pass "$description - $endpoint_count endpoints"
            
            # List endpoints if verbose
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$resources" | jq -r '.[] | "      \(.path) [\(.resourceMethods | keys | join(", "))]"'
            fi
        else
            log_fail "$description not found"
        fi
    done
    
    echo ""
    echo "  Total API Gateways: ${api_count}/${#expected_apis[@]}"
    echo "  Total endpoints: $total_endpoints"
}

# Validate S3 Buckets
validate_s3_buckets() {
    section_header "S3 Buckets"
    
    # Expected buckets
    declare -A s3_buckets=(
        ["mcr-${STAGE}-documents-cdk"]="Document uploads"
        ["mcr-${STAGE}-qa-cdk"]="QA uploads"
        ["mcr-${STAGE}-frontend-cdk"]="Frontend assets"
        ["mcr-${STAGE}-storybook-cdk"]="Storybook assets"
    )
    
    if [[ "$STAGE" == "dev" ]]; then
        # Dev has additional buckets
        s3_buckets["postgres-${STAGE}-data-export-cdk"]="Database exports"
    fi
    
    local bucket_count=0
    
    for bucket_name in "${!s3_buckets[@]}"; do
        description="${s3_buckets[$bucket_name]}"
        
        log_test "$bucket_name"
        
        if aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
            ((bucket_count++))
            
            # Check versioning
            versioning=$(aws s3api get-bucket-versioning --bucket "$bucket_name" --query 'Status' --output text 2>/dev/null || echo "not-enabled")
            
            # Check encryption
            if aws s3api get-bucket-encryption --bucket "$bucket_name" >/dev/null 2>&1; then
                encryption="enabled"
            else
                encryption="disabled"
            fi
            
            log_pass "$description (versioning: $versioning, encryption: $encryption)"
        else
            log_fail "$description not found"
        fi
    done
    
    echo ""
    echo "  Total S3 buckets: ${bucket_count}/${#s3_buckets[@]}"
}

# Validate Database
validate_database() {
    section_header "Database (Aurora Serverless v2)"
    
    log_test "Aurora cluster"
    
    clusters=$(aws rds describe-db-clusters --query "DBClusters[?contains(DBClusterIdentifier, 'mcr-${STAGE}')]" --output json 2>/dev/null || echo "[]")
    
    if [[ "$clusters" != "[]" ]] && [[ $(echo "$clusters" | jq 'length') -gt 0 ]]; then
        cluster_info=$(echo "$clusters" | jq -r '.[0]')
        cluster_id=$(echo "$cluster_info" | jq -r '.DBClusterIdentifier')
        engine=$(echo "$cluster_info" | jq -r '.Engine')
        status=$(echo "$cluster_info" | jq -r '.Status')
        
        log_pass "$cluster_id - $engine (status: $status)"
        
        # Check if Serverless v2
        log_test "Serverless v2 configuration"
        if echo "$cluster_info" | jq -e '.ServerlessV2ScalingConfiguration' >/dev/null 2>&1; then
            min_capacity=$(echo "$cluster_info" | jq -r '.ServerlessV2ScalingConfiguration.MinCapacity')
            max_capacity=$(echo "$cluster_info" | jq -r '.ServerlessV2ScalingConfiguration.MaxCapacity')
            log_pass "Min: $min_capacity ACU, Max: $max_capacity ACU"
        else
            log_fail "Not configured as Serverless v2"
        fi
        
        # Check database instances
        instances=$(echo "$cluster_info" | jq -r '.DBClusterMembers | length')
        echo "  Database instances: $instances"
    else
        log_fail "No Aurora cluster found"
    fi
}

# Validate Authentication
validate_authentication() {
    section_header "Cognito Authentication"
    
    log_test "User Pool"
    
    user_pools=$(aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?contains(Name, 'mcr-${STAGE}')]" --output json 2>/dev/null || echo "[]")
    
    if [[ "$user_pools" != "[]" ]] && [[ $(echo "$user_pools" | jq 'length') -gt 0 ]]; then
        pool_info=$(echo "$user_pools" | jq -r '.[0]')
        pool_name=$(echo "$pool_info" | jq -r '.Name')
        pool_id=$(echo "$pool_info" | jq -r '.Id')
        
        log_pass "$pool_name"
        
        # Check app clients
        log_test "App clients"
        clients=$(aws cognito-idp list-user-pool-clients --user-pool-id "$pool_id" --query 'UserPoolClients' --output json 2>/dev/null || echo "[]")
        client_count=$(echo "$clients" | jq 'length')
        
        if [[ $client_count -gt 0 ]]; then
            log_pass "$client_count app client(s) configured"
        else
            log_fail "No app clients found"
        fi
        
        # Check identity pool
        log_test "Identity Pool"
        identity_pools=$(aws cognito-identity list-identity-pools --max-results 60 --query "IdentityPools[?contains(IdentityPoolName, 'mcr_${STAGE}')]" --output json 2>/dev/null || echo "[]")
        
        if [[ $(echo "$identity_pools" | jq 'length') -gt 0 ]]; then
            identity_pool_name=$(echo "$identity_pools" | jq -r '.[0].IdentityPoolName')
            log_pass "$identity_pool_name"
        else
            log_fail "No identity pool found"
        fi
    else
        log_fail "No User Pool found"
    fi
}

# Validate CloudFront
validate_cloudfront() {
    section_header "CloudFront Distribution"
    
    log_test "Frontend distribution"
    
    distributions=$(aws cloudfront list-distributions --query "DistributionList.Items[?contains(Comment, 'MCR-Frontend-${STAGE}-cdk')]" --output json 2>/dev/null || echo "[]")
    
    if [[ "$distributions" != "[]" ]] && [[ $(echo "$distributions" | jq 'length') -gt 0 ]]; then
        dist_info=$(echo "$distributions" | jq -r '.[0]')
        dist_id=$(echo "$dist_info" | jq -r '.Id')
        domain=$(echo "$dist_info" | jq -r '.DomainName')
        status=$(echo "$dist_info" | jq -r '.Status')
        
        log_pass "$domain (status: $status)"
        
        # Check custom domain if prod
        if [[ "$STAGE" == "prod" ]]; then
            log_test "Custom domain"
            aliases=$(echo "$dist_info" | jq -r '.Aliases.Items[]' 2>/dev/null | head -1)
            if [[ -n "$aliases" ]]; then
                log_pass "$aliases"
            else
                log_warn "No custom domain configured"
            fi
        fi
    else
        log_fail "No CloudFront distribution found"
    fi
}

# Validate Lambda Layers
validate_lambda_layers() {
    section_header "Lambda Layers"
    
    declare -A expected_layers=(
        ["mcr-otel-${STAGE}"]="OpenTelemetry layer"
        ["mcr-prisma-engine-${STAGE}"]="Prisma engine layer"
        ["mcr-prisma-migration-${STAGE}"]="Prisma migration layer"
        ["mcr-postgres-tools-${STAGE}"]="PostgreSQL tools layer"
    )
    
    local layer_count=0
    
    for layer_name in "${!expected_layers[@]}"; do
        description="${expected_layers[$layer_name]}"
        
        log_test "$layer_name"
        
        versions=$(aws lambda list-layer-versions --layer-name "$layer_name" --max-items 1 --query 'LayerVersions[0]' --output json 2>/dev/null || echo "null")
        
        if [[ "$versions" != "null" ]]; then
            ((layer_count++))
            version=$(echo "$versions" | jq -r '.Version')
            size=$(echo "$versions" | jq -r '.CodeSize')
            size_mb=$((size / 1024 / 1024))
            
            log_pass "$description v$version (${size_mb}MB)"
        else
            log_fail "$description not found"
        fi
    done
    
    echo ""
    echo "  Total Lambda layers: ${layer_count}/${#expected_layers[@]}"
}

# Validate SSM Parameters
validate_ssm_parameters() {
    section_header "SSM Parameters"
    
    log_test "CDK parameters with /mcr-cdk/ prefix"
    
    params=$(aws ssm describe-parameters --parameter-filters "Key=Name,Option=BeginsWith,Values=/mcr-cdk/${STAGE}/" --query 'Parameters' --output json 2>/dev/null || echo "[]")
    param_count=$(echo "$params" | jq 'length')
    
    if [[ $param_count -gt 0 ]]; then
        log_pass "$param_count parameters found"
        
        # Check critical parameters
        critical_params=(
            "/mcr-cdk/${STAGE}/frontend/build/metadata/source/USER_POOL_CLIENT_ID"
            "/mcr-cdk/${STAGE}/frontend/build/metadata/source/IDENTITY_POOL_ID"
            "/mcr-cdk/${STAGE}/service-registry/api/url"
        )
        
        echo "  Checking critical parameters:"
        for param in "${critical_params[@]}"; do
            echo -n "    $(basename $param)... "
            if aws ssm get-parameter --name "$param" >/dev/null 2>&1; then
                echo "${GREEN}✓${NC}"
            else
                echo "${RED}✗${NC}"
                ((FAILED_TESTS++))
            fi
        done
    else
        log_fail "No CDK parameters found"
    fi
}

# Compare with Serverless
compare_with_serverless() {
    section_header "Serverless vs CDK Comparison"
    
    echo "  Checking for duplicate resources..."
    
    # Check for old serverless SSM parameters
    log_test "Old serverless parameters (/mcr/)"
    old_params=$(aws ssm describe-parameters --parameter-filters "Key=Name,Option=BeginsWith,Values=/mcr/${STAGE}/" --query 'Parameters | length' --output text 2>/dev/null || echo "0")
    
    if [[ $old_params -gt 0 ]]; then
        log_warn "$old_params serverless parameters still exist"
    else
        log_pass "No conflicting serverless parameters"
    fi
    
    # Check for old S3 buckets
    log_test "Old serverless S3 buckets"
    old_bucket_count=0
    for bucket in "mcr-${STAGE}-documents" "mcr-${STAGE}-qa" "mcr-${STAGE}-frontend"; do
        if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
            ((old_bucket_count++))
        fi
    done
    
    if [[ $old_bucket_count -gt 0 ]]; then
        log_warn "$old_bucket_count serverless buckets still exist"
    else
        log_pass "No conflicting serverless buckets"
    fi
}

# Performance tests
run_performance_tests() {
    section_header "Performance Tests"
    
    # Test Lambda cold start
    log_test "Lambda cold start (health check)"
    
    # Force cold start by updating environment variable
    aws lambda update-function-configuration \
        --function-name "MCR-health-${STAGE}-cdk" \
        --environment "Variables={COLD_START_TEST=$(date +%s)}" \
        >/dev/null 2>&1
    
    sleep 5  # Wait for update
    
    # Time the invocation
    start_time=$(date +%s%N)
    aws lambda invoke \
        --function-name "MCR-health-${STAGE}-cdk" \
        --payload '{"httpMethod":"GET","path":"/health"}' \
        /tmp/perf-test.json >/dev/null 2>&1
    end_time=$(date +%s%N)
    
    duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [[ $duration_ms -lt 3000 ]]; then
        log_pass "Cold start: ${duration_ms}ms"
    else
        log_warn "Cold start: ${duration_ms}ms (>3s)"
    fi
    
    rm -f /tmp/perf-test.json
}

# Generate summary report
generate_summary() {
    echo ""
    echo "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${PURPLE}                              VALIDATION SUMMARY                               ${NC}"
    echo "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo "Total Tests: $TOTAL_TESTS"
    echo "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo "${RED}Failed: $FAILED_TESTS${NC}"
    echo "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    
    # Calculate percentage
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
        echo "Success Rate: ${success_rate}%"
    fi
    
    # Show failures
    if [[ ${#FAILURES[@]} -gt 0 ]]; then
        echo ""
        echo "${RED}Failures:${NC}"
        for failure in "${FAILURES[@]}"; do
            echo "  - $failure"
        done
    fi
    
    # Show warnings
    if [[ ${#WARNINGS_LIST[@]} -gt 0 ]]; then
        echo ""
        echo "${YELLOW}Warnings:${NC}"
        for warning in "${WARNINGS_LIST[@]}"; do
            echo "  - $warning"
        done
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Final result
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo ""
        echo "${GREEN}✅ CDK DEPLOYMENT VALIDATION PASSED!${NC}"
        echo ""
        echo "The CDK deployment is functioning correctly."
        return 0
    else
        echo ""
        echo "${RED}❌ CDK DEPLOYMENT VALIDATION FAILED!${NC}"
        echo ""
        echo "Please review the failures above and fix the deployment issues."
        return 1
    fi
}

# Main execution
main() {
    echo "Starting validation at $(date)"
    echo ""
    
    # Run all validation steps
    check_prerequisites
    validate_lambda_functions
    validate_api_gateways
    validate_s3_buckets
    validate_database
    validate_authentication
    validate_cloudfront
    validate_lambda_layers
    validate_ssm_parameters
    compare_with_serverless
    
    # Optional performance tests
    if [[ "${RUN_PERF_TESTS:-false}" == "true" ]]; then
        run_performance_tests
    fi
    
    # Generate summary
    generate_summary
}

# Run main function
main

# Exit with appropriate code
exit $?