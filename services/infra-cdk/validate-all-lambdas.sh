#!/bin/bash

# =============================================================================
# Comprehensive Lambda Validation Script
# Ultra-precise validation, monitoring, and auto-fix for all MCR lambdas
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
CONFIG_FILE="${SCRIPT_DIR}/lambda-validation-config.json"
LOG_DIR="${SCRIPT_DIR}/validation-logs"
REPORT_FILE="${LOG_DIR}/validation-report-$(date +%Y%m%d-%H%M%S).json"
REGION="us-east-1"
MAX_PARALLEL_JOBS=10
VERBOSE=false

# Global variables
STAGE=""
LAMBDAS=()
FAILED_LAMBDAS=()
SUCCESS_COUNT=0
TOTAL_LAMBDA_COUNT=0
VALIDATION_START_TIME=$(date +%s)

# =============================================================================
# Utility Functions
# =============================================================================

# Safe logging functions with error handling
safe_echo() {
    echo -e "$1" 2>/dev/null || printf "%s\n" "$1" 2>/dev/null || true
}

log() {
    safe_echo "${WHITE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_info() {
    safe_echo "${BLUE}[INFO]${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        safe_echo "${PURPLE}[DEBUG]${NC} $1"
    fi
}

log_success() {
    safe_echo "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    safe_echo "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    safe_echo "${RED}[ERROR]${NC} $1" >&2
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

# =============================================================================
# Environment Detection
# =============================================================================

detect_stage() {
    log_section "Detecting Deployment Stage"
    
    # Try multiple methods to detect stage
    local detected_stage=""
    
    # Method 1: CDK context
    if [[ -f "cdk.context.json" ]]; then
        log_info "Checking CDK context..."
        detected_stage=$(cat cdk.context.json 2>/dev/null | jq -r '.stage // empty' || echo "")
    fi
    
    # Method 2: Environment variable
    if [[ -z "$detected_stage" && -n "${STAGE:-}" ]]; then
        detected_stage="$STAGE"
        log_info "Using STAGE environment variable: $detected_stage"
    fi
    
    # Method 3: Git branch analysis
    if [[ -z "$detected_stage" ]]; then
        local branch_name=$(git branch --show-current 2>/dev/null || echo "")
        if [[ "$branch_name" == "main" ]]; then
            detected_stage="prod"
        elif [[ "$branch_name" == "val" ]]; then
            detected_stage="val"
        elif [[ "$branch_name" == "develop" ]]; then
            detected_stage="dev"
        fi
        [[ -n "$detected_stage" ]] && log_info "Inferred stage from git branch '$branch_name': $detected_stage"
    fi
    
    # Method 4: Lambda function discovery
    if [[ -z "$detected_stage" ]]; then
        log_info "Attempting to discover stage from deployed lambdas..."
        log_debug "Running: aws lambda list-functions --region $REGION --query 'Functions[?starts_with(FunctionName, \`mcr-cdk-\`)].FunctionName' --output text"
        
        local lambda_names
        if lambda_names=$(aws lambda list-functions --region "$REGION" --query 'Functions[?starts_with(FunctionName, `mcr-cdk-`)].FunctionName' --output text 2>/dev/null); then
            log_debug "Lambda discovery result: $lambda_names"
            if [[ -n "$lambda_names" && "$lambda_names" != "None" ]]; then
                for name in $lambda_names; do
                    if [[ "$name" =~ mcr-cdk-([^-]+)- ]]; then
                        detected_stage="${BASH_REMATCH[1]}"
                        log_info "Discovered stage from lambda '$name': $detected_stage"
                        break
                    fi
                done
            else
                log_debug "No MCR lambdas found with pattern mcr-cdk-*"
            fi
        else
            log_debug "Failed to list lambda functions"
        fi
    fi
    
    # Interactive fallback
    if [[ -z "$detected_stage" ]]; then
        echo -e "${YELLOW}Could not auto-detect stage. Please enter stage (dev/val/prod):${NC}" 
        read -r detected_stage
        
        # Validate input
        case "$detected_stage" in
            dev|val|prod)
                log_info "Selected stage: $detected_stage"
                ;;
            *)
                log_error "Invalid stage: $detected_stage. Must be dev, val, or prod"
                exit 1
                ;;
        esac
    fi
    
    STAGE="$detected_stage"
    log_success "Using stage: $STAGE"
}

# =============================================================================
# Lambda Discovery
# =============================================================================

discover_lambdas() {
    log_section "Discovering Lambda Functions"
    
    log_info "Searching for MCR lambdas in stage: $STAGE"
    log_debug "AWS CLI Command: aws lambda list-functions --region $REGION --query \"Functions[?starts_with(FunctionName, 'mcr-cdk-$STAGE-') || starts_with(FunctionName, 'mcr-$STAGE-')]...\""
    
    local lambda_list
    if lambda_list=$(aws lambda list-functions \
        --region "$REGION" \
        --query "Functions[?starts_with(FunctionName, 'mcr-cdk-$STAGE-') || starts_with(FunctionName, 'mcr-$STAGE-')].{Name:FunctionName,Runtime:Runtime,MemorySize:MemorySize,Timeout:Timeout,LastModified:LastModified}" \
        --output json 2>&1); then
        
        log_debug "Lambda list query successful"
        
        if [[ -z "$lambda_list" || "$lambda_list" == "[]" ]]; then
            log_error "No lambda functions found for stage: $STAGE"
            log_debug "Trying alternative discovery method..."
            
            # Alternative: list all functions and filter locally
            local all_functions
            if all_functions=$(aws lambda list-functions --region "$REGION" --output json 2>/dev/null); then
                lambda_list=$(echo "$all_functions" | jq "[.Functions[] | select(.FunctionName | startswith(\"mcr-cdk-$STAGE-\") or startswith(\"mcr-$STAGE-\")) | {Name:.FunctionName,Runtime:.Runtime,MemorySize:.MemorySize,Timeout:.Timeout,LastModified:.LastModified}]")
                if [[ "$lambda_list" == "[]" ]]; then
                    log_error "No MCR lambda functions found for stage $STAGE in region $REGION"
                    log_info "Available functions:"
                    echo "$all_functions" | jq -r '.Functions[].FunctionName' | head -10
                    exit 1
                fi
            else
                log_error "Failed to connect to AWS Lambda API"
                exit 1
            fi
        fi
    else
        log_error "AWS CLI error: $lambda_list"
        exit 1
    fi
    
    LAMBDAS=($(echo "$lambda_list" | jq -r '.[].Name' 2>/dev/null))
    TOTAL_LAMBDA_COUNT=${#LAMBDAS[@]}
    
    if [[ $TOTAL_LAMBDA_COUNT -eq 0 ]]; then
        log_error "No lambda functions discovered"
        exit 1
    fi
    
    log_success "Found $TOTAL_LAMBDA_COUNT lambda functions:"
    for lambda in "${LAMBDAS[@]}"; do
        safe_echo "  • $lambda"
    done
    
    # Store detailed lambda info for later use
    echo "$lambda_list" > "${LOG_DIR}/lambda-inventory.json"
    log_debug "Lambda inventory saved to ${LOG_DIR}/lambda-inventory.json"
}

# =============================================================================
# Configuration Validation
# =============================================================================

validate_lambda_config() {
    local lambda_name="$1"
    local config_file="${LOG_DIR}/${lambda_name}-config.json"
    local validation_result="${LOG_DIR}/${lambda_name}-validation.json"
    
    log_info "Validating configuration for: $lambda_name"
    log_debug "Getting lambda configuration from AWS API"
    
    # Get lambda configuration with error handling
    if ! aws lambda get-function \
        --region "$REGION" \
        --function-name "$lambda_name" \
        --output json > "$config_file" 2>/dev/null; then
        log_error "Failed to get configuration for $lambda_name"
        return 1
    fi
    
    log_debug "Lambda configuration retrieved successfully for $lambda_name"
    
    # Extract configuration values with error handling
    local runtime=$(jq -r '.Configuration.Runtime // "unknown"' "$config_file" 2>/dev/null || echo "unknown")
    local memory=$(jq -r '.Configuration.MemorySize // 0' "$config_file" 2>/dev/null || echo "0")
    local timeout=$(jq -r '.Configuration.Timeout // 0' "$config_file" 2>/dev/null || echo "0")
    local handler=$(jq -r '.Configuration.Handler // "unknown"' "$config_file" 2>/dev/null || echo "unknown")
    local layers_count=$(jq -r '.Configuration.Layers // [] | length' "$config_file" 2>/dev/null || echo "0")
    
    log_debug "Configuration extracted - Runtime: $runtime, Memory: $memory, Timeout: $timeout, Layers: $layers_count"
    
    # Safely extract environment variables with comprehensive null handling
    local env_vars
    if env_vars=$(jq -r '.Configuration.Environment.Variables // {}' "$config_file" 2>/dev/null); then
        log_debug "Environment variables extracted for $lambda_name"
    else
        log_debug "No environment variables found for $lambda_name, using empty object"
        env_vars="{}"
    fi
    
    local env_vars_count
    if env_vars_count=$(echo "$env_vars" | jq -r 'if type == "object" then keys | length else 0 end' 2>/dev/null); then
        log_debug "Environment variables count for $lambda_name: $env_vars_count"
    else
        env_vars_count="0"
        log_debug "Could not count environment variables for $lambda_name, defaulting to 0"
    fi
    
    # Show environment variables in verbose mode
    if [[ "$VERBOSE" == "true" && "$env_vars_count" -gt 0 ]]; then
        log_debug "Environment variables for $lambda_name:"
        echo "$env_vars" | jq -r 'to_entries[] | "    " + .key + "=" + (.value | tostring)' 2>/dev/null | while read -r env_line; do
            log_debug "$env_line"
        done
    fi
    
    local vpc_config=$(jq -r '.Configuration.VpcConfig.VpcId // "none"' "$config_file" 2>/dev/null || echo "none")
    
    # VPC configuration validation
    local lambda_base_name=$(echo "$lambda_name" | sed "s/$STAGE/{stage}/g")
    local lambda_config=$(jq ".lambdas[\"$lambda_base_name\"] // {}" "$CONFIG_FILE" 2>/dev/null || echo "{}")
    local requires_vpc=$(echo "$lambda_config" | jq -r '.requires_vpc // false' 2>/dev/null)
    if [[ "$requires_vpc" == "true" ]] || [[ "$lambda_name" =~ (graphql|oauth|db|migrate) ]]; then
        if [[ "$vpc_config" == "none" || "$vpc_config" == "null" ]]; then
            issues+=("VPC configuration missing for database-accessing function")
            recommendations+=("Add VPC configuration with appropriate subnets and security groups")
        fi
    fi
    
    # IAM permissions validation (check if function has expected IAM policies)
    local role_name=$(jq -r '.Configuration.Role // ""' "$config_file" 2>/dev/null | awk -F'/' '{print $NF}')
    if [[ -n "$role_name" ]]; then
        log_debug "Lambda role: $role_name"
        # Note: Full IAM validation would require checking attached policies
        # This is a basic check for role existence
    else
        issues+=("No IAM role found for Lambda function")
        recommendations+=("Ensure Lambda has proper IAM role with required permissions")
    fi
    
    # Load expected configuration
    local expected_config="{}"
    if [[ -f "$CONFIG_FILE" ]]; then
        expected_config=$(jq ".lambdas.\"$lambda_name\" // .defaults" "$CONFIG_FILE" 2>/dev/null || echo "{}")
    fi
    
    # Validation logic
    local issues=()
    local recommendations=()
    
    # Runtime validation
    if [[ "$runtime" != "nodejs20.x" ]]; then
        issues+=("Runtime should be nodejs20.x, found: $runtime")
        recommendations+=("Update runtime to nodejs20.x")
    fi
    
    # Enhanced memory validation based on lambda type and stage
    local expected_memory=1024
    local memory_config=$(jq ".memory_config.$STAGE" "$CONFIG_FILE" 2>/dev/null || echo "{}")
    
    if [[ "$lambda_name" =~ graphql ]]; then
        expected_memory=$(echo "$memory_config" | jq -r '.graphql // 1024' 2>/dev/null || echo "1024")
    elif [[ "$lambda_name" =~ migrate-document-zips ]]; then
        expected_memory=$(echo "$memory_config" | jq -r '."migrate-document-zips" // 2048' 2>/dev/null || echo "2048")
    elif [[ "$lambda_name" =~ (dbExport|dbImport) ]]; then
        expected_memory=2048
    elif [[ "$lambda_name" =~ (health|authorizer|otel) ]]; then
        expected_memory=256
    elif [[ "$lambda_name" =~ (oauth|email-submit|cleanup|audit) ]]; then
        expected_memory=512
    else
        expected_memory=$(echo "$memory_config" | jq -r '.default // 1024' 2>/dev/null || echo "1024")
    fi
    
    if [[ "$memory" -lt "$expected_memory" ]]; then
        issues+=("Memory too low: ${memory}MB, recommended: ${expected_memory}MB")
        recommendations+=("Increase memory to ${expected_memory}MB")
    fi
    
    # Enhanced timeout validation from config
    local timeout_config=$(jq '.timeout_config' "$CONFIG_FILE" 2>/dev/null || echo "{}")
    local expected_timeout=60
    
    # Check specific lambda patterns
    if [[ "$lambda_name" =~ graphql ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '.graphql // 30' 2>/dev/null || echo "30")
    elif [[ "$lambda_name" =~ cleanup ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '.cleanup // 600' 2>/dev/null || echo "600")
    elif [[ "$lambda_name" =~ migrate-document-zips ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '."migrate-document-zips" // 900' 2>/dev/null || echo "900")
    elif [[ "$lambda_name" =~ migrate ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '.migrate // 60' 2>/dev/null || echo "60")
    elif [[ "$lambda_name" =~ dbExport ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '.dbExport // 300' 2>/dev/null || echo "300")
    elif [[ "$lambda_name" =~ dbImport ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '.dbImport // 600' 2>/dev/null || echo "600")
    elif [[ "$lambda_name" =~ health ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '.health // 29' 2>/dev/null || echo "29")
    elif [[ "$lambda_name" =~ (zip-keys|audit-files) ]]; then
        expected_timeout=$(echo "$timeout_config" | jq -r '."zip-keys" // 60' 2>/dev/null || echo "60")
    else
        expected_timeout=$(echo "$timeout_config" | jq -r '.default // 60' 2>/dev/null || echo "60")
    fi
    
    if [[ "$timeout" -lt "$expected_timeout" ]]; then
        issues+=("Timeout too low: ${timeout}s, recommended: ${expected_timeout}s")
        recommendations+=("Increase timeout to ${expected_timeout}s")
    fi
    
    # Enhanced environment variables validation from config
    local lambda_base_name=$(echo "$lambda_name" | sed "s/$STAGE/{stage}/g")
    local lambda_config=$(jq ".lambdas[\"$lambda_base_name\"] // {}" "$CONFIG_FILE" 2>/dev/null || echo "{}")
    
    # Get common required env vars
    local common_required=($(jq -r '.common_env_vars.required[]' "$CONFIG_FILE" 2>/dev/null || echo "STAGE REGION NODE_OPTIONS"))
    
    # Get lambda-specific required env vars
    local specific_required_raw=$(echo "$lambda_config" | jq -r '.required_env_vars[]?' 2>/dev/null || echo "")
    local specific_required=()
    if [[ -n "$specific_required_raw" ]]; then
        IFS=$'\n' read -rd '' -a specific_required <<< "$specific_required_raw" || true
    fi
    
    # Combine all required env vars
    local all_required_vars=("${common_required[@]}")
    if [[ ${#specific_required[@]} -gt 0 ]]; then
        all_required_vars+=("${specific_required[@]}")
    fi
    
    # Remove duplicates
    local unique_required=($(echo "${all_required_vars[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))
    
    if [[ "$env_vars_count" -gt 0 ]]; then
        for env_var in "${unique_required[@]}"; do
            if [[ -n "$env_var" ]] && ! echo "$env_vars" | jq -e "has(\"$env_var\")" >/dev/null 2>&1; then
                issues+=("Missing required environment variable: $env_var")
                recommendations+=("Add environment variable: $env_var")
            fi
        done
        
        # Check for PRISMA_QUERY_ENGINE_LIBRARY for database functions
        local prisma_required=$(echo "$lambda_config" | jq -r '.requires_database // false' 2>/dev/null)
        if [[ "$prisma_required" == "true" ]] || [[ "$lambda_name" =~ (graphql|oauth|audit|db|migrate) ]]; then
            if ! echo "$env_vars" | jq -e 'has("PRISMA_QUERY_ENGINE_LIBRARY")' >/dev/null 2>&1; then
                issues+=("Missing PRISMA_QUERY_ENGINE_LIBRARY for database function")
                recommendations+=("Add PRISMA_QUERY_ENGINE_LIBRARY=./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node")
            else
                # Verify the value is correct
                local prisma_path=$(echo "$env_vars" | jq -r '.PRISMA_QUERY_ENGINE_LIBRARY // ""' 2>/dev/null)
                if [[ "$prisma_path" != "./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" ]]; then
                    issues+=("Incorrect PRISMA_QUERY_ENGINE_LIBRARY path: $prisma_path")
                    recommendations+=("Update to: ./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node")
                fi
            fi
        fi
        
        # Validate expected values
        local expected_values=$(jq '.common_env_vars.expected_values' "$CONFIG_FILE" 2>/dev/null || echo "{}")
        echo "$expected_values" | jq -r 'to_entries[] | "\(.key) \(.value)"' 2>/dev/null | while read -r key expected_value; do
            if echo "$env_vars" | jq -e "has(\"$key\")" >/dev/null 2>&1; then
                local actual_value=$(echo "$env_vars" | jq -r ".\"$key\" // \"\"" 2>/dev/null)
                if [[ "$actual_value" != "$expected_value" ]]; then
                    issues+=("Incorrect value for $key: expected '$expected_value', got '$actual_value'")
                    recommendations+=("Update $key to: $expected_value")
                fi
            fi
        done
    else
        issues+=("No environment variables configured")
        recommendations+=("Add all required environment variables from configuration")
    fi
    
    # Enhanced layer validation
    local expected_otel_layer=$(jq -r '.otel_layer_arn' "$CONFIG_FILE" 2>/dev/null)
    local has_otel_layer=false
    local has_prisma_layer=false
    
    if [[ "$layers_count" -gt 0 ]]; then
        local layers=$(jq -r '.Configuration.Layers[].Arn' "$config_file" 2>/dev/null || echo "")
        for layer in $layers; do
            if [[ "$layer" == "$expected_otel_layer" ]]; then
                has_otel_layer=true
            elif [[ "$layer" =~ prisma|Prisma ]]; then
                has_prisma_layer=true
            fi
        done
    fi
    
    # All functions except minimal ones should have OTEL layer
    if [[ ! "$lambda_name" =~ (health|authorizer|otel) ]] && [[ "$has_otel_layer" == "false" ]]; then
        issues+=("Missing OTEL layer for observability")
        recommendations+=("Add OTEL layer: $expected_otel_layer")
    fi
    
    # No function should have Prisma layers (we bundle directly)
    if [[ "$has_prisma_layer" == "true" ]]; then
        issues+=("Found Prisma layer - should be bundled directly instead")
        recommendations+=("Remove Prisma layer and ensure Prisma is bundled with the function")
    fi
    
    # Create validation result
    local validation_json=$(jq -n \
        --arg lambda "$lambda_name" \
        --arg runtime "$runtime" \
        --argjson memory "$memory" \
        --argjson timeout "$timeout" \
        --arg handler "$handler" \
        --argjson layers "$layers_count" \
        --arg vpc "$vpc_config" \
        --argjson issues "$(printf '%s\n' "${issues[@]:-}" | jq -R . | jq -s .)" \
        --argjson recommendations "$(printf '%s\n' "${recommendations[@]:-}" | jq -R . | jq -s .)" \
        '{
            lambda: $lambda,
            runtime: $runtime,
            memory: $memory,
            timeout: $timeout,
            handler: $handler,
            layers: $layers,
            vpc: $vpc,
            issues: $issues,
            recommendations: $recommendations,
            status: (if ($issues | length) > 0 then "needs_attention" else "healthy" end)
        }')
    
    echo "$validation_json" > "$validation_result"
    
    # Always show detailed validation results
    safe_echo "\n${CYAN}━━━ $lambda_name Configuration Details ━━━${NC}"
    safe_echo "  Runtime: $runtime"
    safe_echo "  Memory: ${memory}MB"
    safe_echo "  Timeout: ${timeout}s"
    safe_echo "  Layers: $layers_count"
    safe_echo "  VPC: $vpc_config"
    safe_echo "  Environment Variables: $env_vars_count"
    
    local issue_count=${#issues[@]}
    if [[ "$issue_count" -eq 0 ]]; then
        log_success "$lambda_name: ✅ All configuration checks PASSED"
        safe_echo "${GREEN}  No issues found - lambda is properly configured${NC}"
    else
        log_warning "$lambda_name: ⚠️ $issue_count configuration issues found"
        safe_echo "${YELLOW}Issues found:${NC}"
        for issue in "${issues[@]:-}"; do
            safe_echo "  ${RED}❌${NC} $issue"
        done
        safe_echo "${BLUE}Recommendations:${NC}"
        for rec in "${recommendations[@]:-}"; do
            safe_echo "  ${GREEN}→${NC} $rec"
        done
    fi
    
    safe_echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    if [[ "$issue_count" -eq 0 ]]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# Health Checks
# =============================================================================

health_check_lambda() {
    local lambda_name="$1"
    local health_result="${LOG_DIR}/${lambda_name}-health.json"
    local response_file="${LOG_DIR}/${lambda_name}-response.json"
    local logs_file="${LOG_DIR}/${lambda_name}-invocation-logs.txt"
    
    safe_echo "\n${CYAN}━━━ Invoking $lambda_name ━━━${NC}"
    log_info "Starting health check and log monitoring for: $lambda_name"
    
    # Determine health check strategy based on lambda type
    local test_payload="{}"
    local expected_status="200"
    local payload_description="Generic test event"
    
    if [[ "$lambda_name" =~ health ]]; then
        test_payload='{"httpMethod":"GET","path":"/health","headers":{}}'
        payload_description="Health check HTTP request"
    elif [[ "$lambda_name" =~ graphql ]]; then
        # GraphQL needs proper requestContext with identity for authentication
        test_payload='{
            "httpMethod":"POST",
            "path":"/graphql",
            "headers":{
                "content-type":"application/json",
                "authorization":"Bearer test-token"
            },
            "requestContext":{
                "accountId":"123456789012",
                "apiId":"test-api",
                "authorizer":{},
                "identity":{
                    "accountId":"123456789012",
                    "apiKey":"test-key",
                    "caller":"test-caller",
                    "cognitoAuthenticationProvider":null,
                    "cognitoAuthenticationType":null,
                    "cognitoIdentityId":null,
                    "cognitoIdentityPoolId":null,
                    "principalOrgId":null,
                    "sourceIp":"127.0.0.1",
                    "user":"test-user",
                    "userAgent":"validation-script",
                    "userArn":"arn:aws:iam::123456789012:user/test"
                },
                "stage":"'$STAGE'",
                "requestId":"test-request-id"
            },
            "body":"{\"query\":\"{ __typename }\"}"
        }'
        # Minify the JSON for easier handling
        test_payload=$(echo "$test_payload" | jq -c .)
        payload_description="GraphQL introspection query with IAM context"
    elif [[ "$lambda_name" =~ authorizer ]]; then
        test_payload='{"type":"TOKEN","authorizationToken":"Bearer test-token","methodArn":"arn:aws:execute-api:us-east-1:123456789012:example/test/GET/health"}'
        payload_description="Authorization request"
    elif [[ "$lambda_name" =~ oauth ]]; then
        test_payload='{
            "httpMethod":"POST",
            "path":"/oauth/token",
            "headers":{"content-type":"application/json"},
            "requestContext":{
                "accountId":"123456789012",
                "apiId":"test-api",
                "identity":{
                    "sourceIp":"127.0.0.1",
                    "userAgent":"validation-script"
                },
                "stage":"'$STAGE'"
            },
            "body":"{\"grant_type\":\"client_credentials\",\"client_id\":\"test\",\"client_secret\":\"test\"}"
        }'
        test_payload=$(echo "$test_payload" | jq -c .)
        payload_description="OAuth token request with context"
    elif [[ "$lambda_name" =~ (cleanup|email-submit) ]]; then
        test_payload='{"test":true,"source":"validation-script","dryRun":true}'
        payload_description="Dry run test event"
    elif [[ "$lambda_name" =~ migrate-document-zips ]]; then
        test_payload='{"test":true,"dryRun":true,"limit":1}'
        payload_description="Document zips migration dry run"
    elif [[ "$lambda_name" =~ migrate ]]; then
        test_payload='{"action":"status","dryRun":true}'
        payload_description="Database migration status check"
    elif [[ "$lambda_name" =~ dbManager ]]; then
        test_payload='{"action":"list","dryRun":true}'
        payload_description="Database manager list operation"
    elif [[ "$lambda_name" =~ dbExport ]]; then
        test_payload='{"action":"status","dryRun":true}'
        payload_description="Database export status check"
    elif [[ "$lambda_name" =~ dbImport ]]; then
        test_payload='{"action":"status","dryRun":true}'
        payload_description="Database import status check"
    elif [[ "$lambda_name" =~ zip-keys ]]; then
        # Use API Gateway event format for zip_keys (not S3)
        test_payload='{
            "httpMethod":"POST",
            "path":"/zip",
            "headers":{"authorization":"Bearer test-token"},
            "requestContext":{
                "accountId":"123456789012",
                "apiId":"test-api",
                "identity":{
                    "sourceIp":"127.0.0.1",
                    "userAgent":"validation-script",
                    "accountId":"123456789012",
                    "userArn":"arn:aws:iam::123456789012:user/test"
                },
                "stage":"'$STAGE'"
            },
            "body":"{\"fileKeys\":[\"test-key\"]}"
        }'
        test_payload=$(echo "$test_payload" | jq -c .)
        payload_description="API Gateway POST /zip request"
    elif [[ "$lambda_name" =~ audit ]]; then
        test_payload='{"Records":[{"eventSource":"aws:s3","eventName":"ObjectCreated:Put","s3":{"bucket":{"name":"test-bucket"},"object":{"key":"test-file.txt"}}}]}'
        payload_description="Mock S3 event"
    elif [[ "$lambda_name" =~ basicauth ]]; then
        test_payload='{"httpMethod":"GET","path":"/","headers":{"authorization":"Basic dGVzdDp0ZXN0"}}'
        payload_description="Basic auth request"
    elif [[ "$lambda_name" =~ ui-auth-redirect ]]; then
        test_payload='{"httpMethod":"GET","path":"/auth/redirect","queryStringParameters":{"code":"test-code"}}'
        payload_description="Auth redirect callback"
    else
        # Generic test event
        test_payload='{"test":true,"source":"validation-script"}'
        payload_description="Generic test event"
    fi
    
    # Create a temporary file for the payload and encode as base64
    local payload_file="${LOG_DIR}/${lambda_name}-payload.json"
    echo "$test_payload" > "$payload_file"
    
    # Encode payload as base64 for AWS CLI
    local encoded_payload=$(echo -n "$test_payload" | base64)
    
    safe_echo "  Payload: $payload_description"
    if [[ "$VERBOSE" == "true" ]]; then
        safe_echo "  ${PURPLE}Full payload:${NC} $test_payload"
    fi
    
    # Start log monitoring in background before invocation
    local log_group="/aws/lambda/$lambda_name"
    safe_echo "  Starting log monitoring for $log_group..."
    
    # Check if log group exists first
    local log_group_exists=false
    if aws logs describe-log-groups --region "$REGION" --log-group-name-prefix "$log_group" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$log_group"; then
        log_group_exists=true
        safe_echo "  Log group found: $log_group"
    else
        safe_echo "  ${YELLOW}⚠ Log group not found: $log_group${NC}"
    fi
    
    safe_echo "  Invoking lambda function..."
    local start_time=$(date +%s)
    local invoke_result
    
    # Invoke lambda with timeout (use gtimeout on macOS or timeout on Linux)
    local timeout_cmd="timeout"
    if command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    elif ! command -v timeout >/dev/null 2>&1; then
        # Fallback: no timeout, just run the command
        timeout_cmd=""
    fi
    
    # Debug output
    if [[ "$VERBOSE" == "true" ]]; then
        safe_echo "  ${BLUE}Debug: Using timeout command: ${timeout_cmd:-none}${NC}"
        safe_echo "  ${BLUE}Debug: Payload size: $(echo -n "$encoded_payload" | wc -c) bytes${NC}"
    fi
    
    # Use base64 encoded payload to avoid encoding issues
    if [[ -n "$timeout_cmd" ]]; then
        invoke_result=$($timeout_cmd 60s aws lambda invoke \
            --region "$REGION" \
            --function-name "$lambda_name" \
            --payload "$encoded_payload" \
            --log-type Tail \
            --output json \
            "$response_file" 2>&1)
    else
        invoke_result=$(aws lambda invoke \
            --region "$REGION" \
            --function-name "$lambda_name" \
            --payload "$encoded_payload" \
            --log-type Tail \
            --output json \
            "$response_file" 2>&1)
    fi
    
    local invoke_exit_code=$?
    
    if [[ $invoke_exit_code -eq 0 ]]; then
        safe_echo "  ${GREEN}✓ Invocation command succeeded${NC}"
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        # Convert to milliseconds for display
        duration=$((duration * 1000))
        local status_code=$(echo "$invoke_result" | jq -r '.StatusCode // 0')
        local function_error=$(echo "$invoke_result" | jq -r '.FunctionError // "none"')
        local log_result=$(echo "$invoke_result" | jq -r '.LogResult // ""' | base64 -d 2>/dev/null || echo "")
        
        # Get recent logs after invocation
        if [[ "$log_group_exists" == "true" ]]; then
            safe_echo "  ${BLUE}Fetching recent logs...${NC}"
            local current_epoch=$(date +%s)
            local end_time="${current_epoch}000"
            local start_epoch=$((current_epoch - 300))  # 5 minutes ago
            local start_time="${start_epoch}000"
            
            # Get logs from the time around invocation
            safe_echo "  Fetching logs from $start_time to $end_time"
            local recent_logs
            if recent_logs=$(aws logs filter-log-events \
                --region "$REGION" \
                --log-group-name "$log_group" \
                --start-time "$start_time" \
                --end-time "$end_time" \
                --query 'events[*].[timestamp,message]' \
                --output text 2>&1); then
                
                if [[ -n "$recent_logs" && "$recent_logs" != "None" ]]; then
                    echo "$recent_logs" > "$logs_file"
                    local log_count=$(echo "$recent_logs" | wc -l)
                    safe_echo "  ${GREEN}✓ Retrieved $log_count log entries${NC}"
                else
                    safe_echo "  ${YELLOW}No recent log entries found in the time window${NC}"
                    # Try a wider time window (last 30 minutes)
                    local wider_start_epoch=$((current_epoch - 1800))
                    local wider_start_time="${wider_start_epoch}000"
                    safe_echo "  Trying wider time window (30 minutes)..."
                    
                    if recent_logs=$(aws logs filter-log-events \
                        --region "$REGION" \
                        --log-group-name "$log_group" \
                        --start-time "$wider_start_time" \
                        --end-time "$end_time" \
                        --query 'events[*].[timestamp,message]' \
                        --output text 2>&1); then
                        
                        if [[ -n "$recent_logs" && "$recent_logs" != "None" ]]; then
                            echo "$recent_logs" > "$logs_file"
                            local log_count=$(echo "$recent_logs" | wc -l)
                            safe_echo "  ${GREEN}✓ Retrieved $log_count log entries from wider window${NC}"
                        else
                            safe_echo "  ${YELLOW}No log entries found even in 30-minute window${NC}"
                        fi
                    fi
                fi
            else
                safe_echo "  ${RED}Failed to retrieve logs: $recent_logs${NC}"
            fi
        fi
        
        # Show invocation results
        safe_echo "  ${GREEN}✓ Invocation completed${NC}"
        safe_echo "    Duration: ${duration}ms"
        safe_echo "    Status Code: $status_code"
        safe_echo "    Function Error: $function_error"
        
        # Show response payload
        if [[ -f "$response_file" ]]; then
            local response_size=$(wc -c < "$response_file" 2>/dev/null || echo "0")
            safe_echo "    Response Size: ${response_size} bytes"
            
            if [[ "$VERBOSE" == "true" ]]; then
                safe_echo "  ${BLUE}Response Payload:${NC}"
                if [[ $response_size -gt 0 && $response_size -lt 1000 ]]; then
                    cat "$response_file" | jq . 2>/dev/null || cat "$response_file" | sed 's/^/    /'
                else
                    safe_echo "    (Response too large or empty, saved to $response_file)"
                fi
            fi
        fi
        
        # Show CloudWatch logs from invocation response
        if [[ -n "$log_result" ]]; then
            safe_echo "  ${YELLOW}Lambda Execution Logs:${NC}"
            echo "$log_result" | sed 's/^/    /' | head -20
        fi
        
        # Show recent logs from CloudWatch
        if [[ -f "$logs_file" && -s "$logs_file" ]]; then
            safe_echo "  ${YELLOW}Recent CloudWatch Logs:${NC}"
            local log_count=0
            # Format and show recent logs
            while IFS=$'\t' read -r timestamp message; do
                if [[ -n "$timestamp" && -n "$message" ]]; then
                    ((log_count++))
                    # Safe timestamp conversion (avoid arithmetic overflow)
                    local formatted_time="Unknown"
                    if [[ "$timestamp" =~ ^[0-9]+$ && ${#timestamp} -ge 10 ]]; then
                        # Remove last 3 digits (milliseconds) using string manipulation
                        local epoch_seconds=${timestamp%???}
                        if [[ -n "$epoch_seconds" && "$epoch_seconds" =~ ^[0-9]+$ ]]; then
                            formatted_time=$(date -r "$epoch_seconds" +'%H:%M:%S' 2>/dev/null || echo "${timestamp:0:10}")
                        else
                            formatted_time="$timestamp"
                        fi
                    else
                        formatted_time="$timestamp"
                    fi
                    safe_echo "    [$formatted_time] $message"
                fi
            done < "$logs_file" | tail -15
            
            if [[ $log_count -eq 0 ]]; then
                safe_echo "  ${YELLOW}Log file exists but no valid log entries found${NC}"
                # Show raw content for debugging
                if [[ "$VERBOSE" == "true" ]]; then
                    safe_echo "  ${PURPLE}Raw log file content:${NC}"
                    head -5 "$logs_file" | sed 's/^/    RAW: /'
                fi
            fi
        else
            safe_echo "  ${YELLOW}No CloudWatch logs retrieved${NC}"
            if [[ "$VERBOSE" == "true" ]]; then
                safe_echo "  ${PURPLE}Debug: logs_file=$logs_file, exists=$(test -f "$logs_file" && echo yes || echo no), size=$(test -s "$logs_file" && echo non-empty || echo empty)${NC}"
            fi
        fi
        
        # Check for errors in logs
        local has_errors="false"
        local error_patterns="(ERROR|Exception|Error:|Task timed out|FATAL|Error)"
        
        if echo "$log_result" | grep -E "$error_patterns" >/dev/null 2>&1; then
            has_errors="true"
            safe_echo "  ${RED}⚠ Errors detected in CloudWatch logs${NC}"
        fi
        
        # Also check recent logs for errors
        if [[ -f "$logs_file" ]] && grep -E "$error_patterns" "$logs_file" >/dev/null 2>&1; then
            has_errors="true"
            safe_echo "  ${RED}⚠ Errors detected in recent logs${NC}"
            # Show the error lines
            grep -E "$error_patterns" "$logs_file" | head -3 | sed 's/^/    ERROR: /'
        fi
        
        local health_status="healthy"
        if [[ "$status_code" != "200" || "$function_error" != "none" || "$has_errors" == "true" ]]; then
            health_status="unhealthy"
            safe_echo "  ${RED}❌ Health check FAILED${NC}"
        else
            safe_echo "  ${GREEN}✅ Health check PASSED${NC}"
        fi
        
        # Create health result
        local health_json=$(jq -n \
            --arg lambda "$lambda_name" \
            --argjson status_code "$status_code" \
            --arg function_error "$function_error" \
            --argjson duration "$duration" \
            --arg health_status "$health_status" \
            --arg log_result "$log_result" \
            --argjson has_errors "$has_errors" \
            '{
                lambda: $lambda,
                status_code: $status_code,
                function_error: $function_error,
                duration_ms: $duration,
                health_status: $health_status,
                has_errors: $has_errors,
                logs: $log_result,
                timestamp: now
            }')
        
        echo "$health_json" > "$health_result"
        
        if [[ "$health_status" == "healthy" ]]; then
            log_success "$lambda_name: Health check passed (${duration}ms)"
            safe_echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
            return 0
        else
            log_error "$lambda_name: Health check failed - $function_error"
            safe_echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
            return 1
        fi
    else
        # Still try to get logs even if invocation failed
        if [[ "$log_group_exists" == "true" ]]; then
            safe_echo "  ${BLUE}Checking for error logs...${NC}"
            local current_epoch=$(date +%s)
            local end_time="${current_epoch}000"
            local start_epoch=$((current_epoch - 180))  # 3 minutes ago
            local start_time="${start_epoch}000"
            
            local error_logs
            if error_logs=$(aws logs filter-log-events \
                --region "$REGION" \
                --log-group-name "$log_group" \
                --start-time "$start_time" \
                --end-time "$end_time" \
                --filter-pattern "ERROR" \
                --query 'events[*].message' \
                --output text 2>&1); then
                
                if [[ -n "$error_logs" && "$error_logs" != "None" ]]; then
                    safe_echo "  ${RED}Recent Error Logs:${NC}"
                    echo "$error_logs" | head -5 | sed 's/^/    /'
                else
                    safe_echo "  ${GREEN}No error logs found in recent timeframe${NC}"
                fi
            else
                safe_echo "  ${RED}Failed to check error logs: $error_logs${NC}"
            fi
        fi
        
        log_error "$lambda_name: Health check timeout or invocation failed"
        safe_echo "  ${RED}❌ Invocation failed or timed out (exit code: $invoke_exit_code)${NC}"
        safe_echo "  ${RED}Error output (first 10 lines):${NC}"
        echo "$invoke_result" | head -10 | sed 's/^/    /'
        echo "$invoke_result" > "${LOG_DIR}/${lambda_name}-invoke-error.txt"
        safe_echo "  ${YELLOW}Full error saved to: ${LOG_DIR}/${lambda_name}-invoke-error.txt${NC}"
        echo '{"lambda":"'$lambda_name'","health_status":"timeout","error":"invocation_failed"}' > "$health_result"
        safe_echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        return 1
    fi
}

# =============================================================================
# Log Monitoring
# =============================================================================

tail_lambda_logs() {
    local lambda_name="$1"
    local duration="${2:-60}"
    local log_group="/aws/lambda/$lambda_name"
    
    log_info "Tailing logs for $lambda_name (${duration}s)"
    
    # Check if log group exists
    if ! aws logs describe-log-groups \
        --region "$REGION" \
        --log-group-name-prefix "$log_group" \
        --query 'logGroups[0].logGroupName' \
        --output text >/dev/null 2>&1; then
        log_warning "Log group not found: $log_group"
        return 1
    fi
    
    local start_time=$(date -u -d '5 minutes ago' +%s000)
    local log_file="${LOG_DIR}/${lambda_name}-logs.txt"
    
    # Tail logs in background
    (
        aws logs tail "$log_group" \
            --region "$REGION" \
            --since "${duration}s" \
            --follow \
            --format short 2>/dev/null | \
        while IFS= read -r line; do
            echo "[$(date +'%H:%M:%S')] [$lambda_name] $line" | tee -a "$log_file"
            
            # Check for errors and warnings
            if echo "$line" | grep -E "(ERROR|WARN|Exception|Error:)" >/dev/null; then
                echo "$line" >> "${LOG_DIR}/errors.log"
            fi
        done
    ) &
    
    echo $! > "${LOG_DIR}/${lambda_name}-tail.pid"
}

# =============================================================================
# Auto-Fix Functions
# =============================================================================

auto_fix_lambda() {
    local lambda_name="$1"
    local validation_file="${LOG_DIR}/${lambda_name}-validation.json"
    
    if [[ ! -f "$validation_file" ]]; then
        log_error "No validation file found for $lambda_name"
        return 1
    fi
    
    local issues=$(jq -r '.issues[]' "$validation_file" 2>/dev/null || echo "")
    if [[ -z "$issues" ]]; then
        log_info "$lambda_name: No issues to fix"
        return 0
    fi
    
    log_info "Auto-fixing issues for: $lambda_name"
    
    local fixes_applied=()
    local config_updates="{}"
    
    # Process each issue
    while IFS= read -r issue; do
        if [[ "$issue" =~ Memory\ too\ low.*recommended:\ ([0-9]+)MB ]]; then
            local new_memory="${BASH_REMATCH[1]}"
            config_updates=$(echo "$config_updates" | jq ".MemorySize = $new_memory")
            fixes_applied+=("Memory increased to ${new_memory}MB")
            
        elif [[ "$issue" =~ Timeout\ too\ low.*recommended:\ ([0-9]+)s ]]; then
            local new_timeout="${BASH_REMATCH[1]}"
            config_updates=$(echo "$config_updates" | jq ".Timeout = $new_timeout")
            fixes_applied+=("Timeout increased to ${new_timeout}s")
            
        elif [[ "$issue" =~ Runtime\ should\ be\ nodejs20.x ]]; then
            config_updates=$(echo "$config_updates" | jq '.Runtime = "nodejs20.x"')
            fixes_applied+=("Runtime updated to nodejs20.x")
        fi
    done <<< "$issues"
    
    # Apply configuration updates if any
    if [[ "$(echo "$config_updates" | jq 'keys | length')" -gt 0 ]]; then
        log_info "Applying configuration updates to $lambda_name..."
        
        # Update function configuration
        local update_cmd="aws lambda update-function-configuration --region $REGION --function-name $lambda_name"
        
        if echo "$config_updates" | jq -e '.MemorySize' >/dev/null; then
            local memory=$(echo "$config_updates" | jq -r '.MemorySize')
            update_cmd="$update_cmd --memory-size $memory"
        fi
        
        if echo "$config_updates" | jq -e '.Timeout' >/dev/null; then
            local timeout=$(echo "$config_updates" | jq -r '.Timeout')
            update_cmd="$update_cmd --timeout $timeout"
        fi
        
        if echo "$config_updates" | jq -e '.Runtime' >/dev/null; then
            local runtime=$(echo "$config_updates" | jq -r '.Runtime')
            update_cmd="$update_cmd --runtime $runtime"
        fi
        
        if eval "$update_cmd" >/dev/null 2>&1; then
            log_success "Configuration updated for $lambda_name"
            for fix in "${fixes_applied[@]}"; do
                log_success "  ✓ $fix"
            done
        else
            log_error "Failed to update configuration for $lambda_name"
            return 1
        fi
    fi
    
    # Enhanced environment variable auto-fix with config awareness
    local env_issues=$(echo "$issues" | grep "Missing required environment variable" || echo "")
    if [[ -n "$env_issues" ]]; then
        log_info "Adding missing environment variables..."
        
        # Get current environment variables
        local current_env=$(aws lambda get-function \
            --region "$REGION" \
            --function-name "$lambda_name" \
            --query 'Configuration.Environment.Variables' \
            --output json 2>/dev/null || echo "{}")
        
        # Get lambda config to determine required env vars
        local lambda_base_name=$(echo "$lambda_name" | sed "s/$STAGE/{stage}/g")
        local lambda_config=$(jq ".lambdas[\"$lambda_base_name\"] // {}" "$CONFIG_FILE" 2>/dev/null || echo "{}")
        
        # Add common required variables
        if ! echo "$current_env" | jq -e '.STAGE' >/dev/null; then
            current_env=$(echo "$current_env" | jq ".STAGE = \"$STAGE\"")
        fi
        if ! echo "$current_env" | jq -e '.stage' >/dev/null; then
            current_env=$(echo "$current_env" | jq ".stage = \"$STAGE\"")
        fi
        if ! echo "$current_env" | jq -e '.REGION' >/dev/null; then
            current_env=$(echo "$current_env" | jq ".REGION = \"$REGION\"")
        fi
        if ! echo "$current_env" | jq -e '.NODE_OPTIONS' >/dev/null; then
            current_env=$(echo "$current_env" | jq '.NODE_OPTIONS = "--enable-source-maps"')
        fi
        if ! echo "$current_env" | jq -e '.AWS_NODEJS_CONNECTION_REUSE_ENABLED' >/dev/null; then
            current_env=$(echo "$current_env" | jq '.AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"')
        fi
        
        # Add OTEL configuration
        if ! echo "$current_env" | jq -e '.AWS_LAMBDA_EXEC_WRAPPER' >/dev/null; then
            current_env=$(echo "$current_env" | jq '.AWS_LAMBDA_EXEC_WRAPPER = "/opt/otel-handler"')
        fi
        if ! echo "$current_env" | jq -e '.OPENTELEMETRY_COLLECTOR_CONFIG_FILE' >/dev/null; then
            current_env=$(echo "$current_env" | jq '.OPENTELEMETRY_COLLECTOR_CONFIG_FILE = "/var/task/collector.yml"')
        fi
        
        # Add PRISMA configuration for database functions
        local requires_db=$(echo "$lambda_config" | jq -r '.requires_database // false' 2>/dev/null)
        if [[ "$requires_db" == "true" ]] || [[ "$lambda_name" =~ (graphql|oauth|audit|db|migrate) ]]; then
            if ! echo "$current_env" | jq -e '.PRISMA_QUERY_ENGINE_LIBRARY' >/dev/null; then
                current_env=$(echo "$current_env" | jq '.PRISMA_QUERY_ENGINE_LIBRARY = "./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"')
            fi
            if ! echo "$current_env" | jq -e '.DATABASE_ENGINE' >/dev/null; then
                current_env=$(echo "$current_env" | jq '.DATABASE_ENGINE = "postgres"')
            fi
        fi
        
        # Update environment variables
        if aws lambda update-function-configuration \
            --region "$REGION" \
            --function-name "$lambda_name" \
            --environment "Variables=$(echo "$current_env" | jq -c .)" >/dev/null 2>&1; then
            log_success "Environment variables updated for $lambda_name"
        else
            log_error "Failed to update environment variables for $lambda_name"
        fi
    fi
    
    # Add missing OTEL layer if needed
    local layer_issues=$(echo "$issues" | grep "Missing OTEL layer" || echo "")
    if [[ -n "$layer_issues" ]]; then
        log_info "Adding OTEL layer..."
        
        local otel_layer=$(jq -r '.otel_layer_arn' "$CONFIG_FILE" 2>/dev/null)
        if [[ -n "$otel_layer" ]]; then
            # Get current layers
            local current_layers=$(aws lambda get-function \
                --region "$REGION" \
                --function-name "$lambda_name" \
                --query 'Configuration.Layers[].Arn' \
                --output json 2>/dev/null || echo "[]")
            
            # Add OTEL layer to the list
            local new_layers=$(echo "$current_layers" | jq ". + [\"$otel_layer\"]" | jq -r '.[]' | tr '\n' ' ')
            
            if aws lambda update-function-configuration \
                --region "$REGION" \
                --function-name "$lambda_name" \
                --layers $new_layers >/dev/null 2>&1; then
                log_success "OTEL layer added for $lambda_name"
            else
                log_error "Failed to add OTEL layer for $lambda_name"
            fi
        fi
    fi
    
    return 0
}

# =============================================================================
# Reporting
# =============================================================================

generate_report() {
    log_section "Generating Comprehensive Report"
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - VALIDATION_START_TIME))
    
    # Collect all validation results
    local validation_results="[]"
    local health_results="[]"
    
    for lambda in "${LAMBDAS[@]}"; do
        local validation_file="${LOG_DIR}/${lambda}-validation.json"
        local health_file="${LOG_DIR}/${lambda}-health.json"
        
        if [[ -f "$validation_file" ]]; then
            validation_results=$(echo "$validation_results" | jq ". + [$(cat "$validation_file")]")
        fi
        
        if [[ -f "$health_file" ]]; then
            health_results=$(echo "$health_results" | jq ". + [$(cat "$health_file")]")
        fi
    done
    
    # Generate summary statistics
    local healthy_count=$(echo "$validation_results" | jq '[.[] | select(.status == "healthy")] | length')
    local needs_attention_count=$(echo "$validation_results" | jq '[.[] | select(.status == "needs_attention")] | length')
    local health_check_passed=$(echo "$health_results" | jq '[.[] | select(.health_status == "healthy")] | length')
    local health_check_failed=$(echo "$health_results" | jq '[.[] | select(.health_status != "healthy")] | length')
    
    # Create comprehensive report
    local report=$(jq -n \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg stage "$STAGE" \
        --argjson total_lambdas "$TOTAL_LAMBDA_COUNT" \
        --argjson healthy_count "$healthy_count" \
        --argjson needs_attention_count "$needs_attention_count" \
        --argjson health_passed "$health_check_passed" \
        --argjson health_failed "$health_check_failed" \
        --argjson duration "$total_duration" \
        --argjson validation_results "$validation_results" \
        --argjson health_results "$health_results" \
        '{
            report_timestamp: $timestamp,
            stage: $stage,
            summary: {
                total_lambdas: $total_lambdas,
                validation: {
                    healthy: $healthy_count,
                    needs_attention: $needs_attention_count
                },
                health_checks: {
                    passed: $health_passed,
                    failed: $health_failed
                },
                overall_health: (if $needs_attention_count == 0 and $health_failed == 0 then "excellent" elif $needs_attention_count < 3 and $health_failed < 2 then "good" elif $needs_attention_count < 5 and $health_failed < 3 then "fair" else "poor" end)
            },
            validation_duration_seconds: $duration,
            validation_results: $validation_results,
            health_results: $health_results
        }')
    
    echo "$report" > "$REPORT_FILE"
    
    # Display summary
    log_section "Validation Summary"
    echo -e "${WHITE}Stage:${NC} $STAGE"
    echo -e "${WHITE}Total Lambdas:${NC} $TOTAL_LAMBDA_COUNT"
    echo -e "${WHITE}Duration:${NC} ${total_duration}s"
    echo ""
    echo -e "${GREEN}Healthy:${NC} $healthy_count"
    echo -e "${YELLOW}Needs Attention:${NC} $needs_attention_count"
    echo -e "${GREEN}Health Checks Passed:${NC} $health_check_passed"
    echo -e "${RED}Health Checks Failed:${NC} $health_check_failed"
    echo ""
    
    local overall_health=$(echo "$report" | jq -r '.summary.overall_health')
    case "$overall_health" in
        "excellent") echo -e "${GREEN}Overall Health: EXCELLENT ✓${NC}";;
        "good") echo -e "${GREEN}Overall Health: GOOD${NC}";;
        "fair") echo -e "${YELLOW}Overall Health: FAIR${NC}";;
        "poor") echo -e "${RED}Overall Health: POOR ⚠${NC}";;
    esac
    
    echo -e "\n${CYAN}Detailed report saved to:${NC} $REPORT_FILE"
    
    # Show top issues
    local top_issues=$(echo "$validation_results" | jq -r '[.[] | .issues[]] | group_by(.) | sort_by(length) | reverse | .[0:5] | .[] | "  • " + .[0] + " (" + (. | length | tostring) + " functions)"' 2>/dev/null || echo "")
    if [[ -n "$top_issues" ]]; then
        echo -e "\n${YELLOW}Top Issues:${NC}"
        echo "$top_issues"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Clean up any payload files
    rm -f "${LOG_DIR}"/*-payload.json 2>/dev/null || true
    
    # Clean up any remaining background processes (just in case)
    pkill -f "aws logs tail" 2>/dev/null || true
    
    log_debug "Cleanup completed"
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -v, --verbose    Enable verbose output"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Setup
    trap cleanup EXIT
    mkdir -p "$LOG_DIR"
    
    log_section "MCR Lambda Comprehensive Validation"
    log "Starting validation at $(date)"
    
    # Core workflow
    detect_stage
    discover_lambdas
    
    # Validation phase - run sequentially to avoid broken pipe issues
    log_section "Configuration Validation Phase"
    
    for lambda in "${LAMBDAS[@]}"; do
        if validate_lambda_config "$lambda"; then
            ((SUCCESS_COUNT++))
        else
            FAILED_LAMBDAS+=("$lambda")
        fi
    done
    
    # Health check phase - invoke each lambda and monitor logs
    log_section "Health Check Phase - Lambda Invocation & Log Monitoring"
    safe_echo "${YELLOW}Invoking all $TOTAL_LAMBDA_COUNT lambda functions with real-time log monitoring...${NC}\n"
    
    local health_passed=0
    local health_failed=0
    
    local current_lambda=0
    for lambda in "${LAMBDAS[@]}"; do
        ((current_lambda++))
        safe_echo "\n${PURPLE}[${current_lambda}/${TOTAL_LAMBDA_COUNT}] Processing: $lambda${NC}"
        
        # Add error handling to continue through all lambdas even if one fails
        set +e  # Don't exit on error
        health_check_lambda "$lambda"
        local result=$?
        set -e  # Re-enable exit on error
        
        if [[ $result -eq 0 ]]; then
            ((health_passed++))
        else
            ((health_failed++))
            safe_echo "  ${RED}⚠ Health check failed for $lambda, continuing to next lambda...${NC}"
        fi
        
        # Small delay between invocations to avoid rate limiting
        if [[ $current_lambda -lt $TOTAL_LAMBDA_COUNT ]]; then
            safe_echo "  ${CYAN}Waiting 2 seconds before next invocation...${NC}"
            sleep 2
        fi
    done
    
    # Show health check summary
    safe_echo "\n${CYAN}═══ HEALTH CHECK SUMMARY ═══${NC}"
    safe_echo "${GREEN}✅ Passed:${NC} $health_passed lambdas"
    safe_echo "${RED}❌ Failed:${NC} $health_failed lambdas"
    safe_echo ""
    
    # Auto-fix phase
    if [[ ${#FAILED_LAMBDAS[@]} -gt 0 ]]; then
        log_section "Auto-Fix Phase"
        echo -e "${YELLOW}Found ${#FAILED_LAMBDAS[@]} lambdas with issues. Attempt auto-fix? (y/N)${NC}"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            for lambda in "${FAILED_LAMBDAS[@]}"; do
                auto_fix_lambda "$lambda"
            done
            
            # Re-validate fixed lambdas
            log_info "Re-validating fixed lambdas..."
            for lambda in "${FAILED_LAMBDAS[@]}"; do
                validate_lambda_config "$lambda"
            done
        fi
    fi
    
    # Log monitoring phase (optional)
    echo -e "\n${YELLOW}Start real-time log monitoring for 60 seconds? (y/N)${NC}"
    read -r -t 10 response || response="n"
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_section "Real-time Log Monitoring"
        
        # Start log tailing for all lambdas
        for lambda in "${LAMBDAS[@]}"; do
            tail_lambda_logs "$lambda" 60 &
        done
        
        log_info "Monitoring logs for 60 seconds... Press Ctrl+C to stop early"
        sleep 60
    fi
    
    # Generate final report
    generate_report
    
    log_section "Validation Complete"
    log_success "All validation tasks completed successfully!"
    
    # Exit with appropriate code
    if [[ ${#FAILED_LAMBDAS[@]} -eq 0 ]]; then
        exit 0
    else
        log_warning "Some lambdas require attention. Check the report for details."
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"