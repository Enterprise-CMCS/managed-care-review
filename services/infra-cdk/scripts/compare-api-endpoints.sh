#!/bin/bash

# Compare Serverless vs CDK API Gateway Endpoints
# Ultra precise analysis to identify endpoint mismatches

set -e

echo "🔍 SERVERLESS vs CDK API GATEWAY ENDPOINT COMPARISON"
echo "==================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "${BLUE}Phase 1: Serverless HTTP Endpoint Analysis${NC}"
echo "----------------------------------------"

# Parse serverless.yml for HTTP endpoints
SERVERLESS_FILE="../app-api/serverless.yml"

if [ ! -f "$SERVERLESS_FILE" ]; then
    echo "${RED}Error: serverless.yml not found at $SERVERLESS_FILE${NC}"
    exit 1
fi

echo "Analyzing serverless.yml for HTTP endpoints..."

# Extract HTTP endpoints with function context
temp_file=$(mktemp)
current_function=""

while IFS= read -r line; do
    # Check if line is a function definition (exactly 2 spaces indentation, ends with colon)
    if echo "$line" | grep -q "^  [a-zA-Z_][a-zA-Z_]*:[[:space:]]*$"; then
        current_function=$(echo "$line" | sed 's/://' | xargs)
    elif echo "$line" | grep -q "^[[:space:]]*- http:"; then
        echo "FUNCTION: $current_function" >> "$temp_file"
    elif echo "$line" | grep -q "^[[:space:]]*path:"; then
        path=$(echo "$line" | sed 's/.*path:[[:space:]]*//' | xargs)
        echo "  PATH: $path" >> "$temp_file"
    elif echo "$line" | grep -q "^[[:space:]]*method:"; then
        method=$(echo "$line" | sed 's/.*method:[[:space:]]*//' | xargs)
        echo "  METHOD: $method" >> "$temp_file"
        echo "  ---" >> "$temp_file"
    fi
done < "$SERVERLESS_FILE"

echo ""
echo "${GREEN}Serverless HTTP Endpoints Found:${NC}"
echo ""

# Process and display endpoints
serverless_endpoints=()
current_func=""
current_path=""
current_method=""

while IFS= read -r line; do
    if echo "$line" | grep -q "^FUNCTION:"; then
        current_func=$(echo "$line" | sed 's/FUNCTION: //')
    elif echo "$line" | grep -q "^[[:space:]]*PATH:"; then
        current_path=$(echo "$line" | sed 's/.*PATH: //')
    elif echo "$line" | grep -q "^[[:space:]]*METHOD:"; then
        current_method=$(echo "$line" | sed 's/.*METHOD: //')
        endpoint="$current_func|$current_method|$current_path"
        serverless_endpoints+=("$endpoint")
        printf "%-20s %-10s %s\n" "$current_func" "$current_method" "$current_path"
    fi
done < "$temp_file"

rm "$temp_file"

echo ""
echo "${YELLOW}Total Serverless HTTP Endpoints: ${#serverless_endpoints[@]}${NC}"

echo ""
echo "${BLUE}Phase 2: CDK API Gateway Configuration Analysis${NC}"
echo "--------------------------------------------"

# Search for CDK API Gateway configurations
echo "Searching CDK files for API Gateway endpoint configurations..."

# Look for API Gateway constructs
cdk_api_files=$(find lib -name "*.ts" -exec grep -l "RestApi\|LambdaRestApi\|addMethod\|addResource\|LambdaIntegration" {} \; 2>/dev/null || true)

if [ -z "$cdk_api_files" ]; then
    echo "${RED}No CDK API Gateway configuration files found${NC}"
else
    echo "${GREEN}CDK files with API Gateway configurations:${NC}"
    for file in $cdk_api_files; do
        echo "  - $file"
    done
fi

echo ""
echo "${BLUE}Phase 3: Function HTTP Endpoint Mapping${NC}"
echo "-------------------------------------"

# Create comparison table
printf "%-20s %-15s %-15s %-10s\n" "Function" "Serverless HTTP" "CDK HTTP" "Match?"
printf "%-20s %-15s %-15s %-10s\n" "--------" "---------------" "---------" "-----"

# List of all functions
functions=("email_submit" "oauth_token" "health" "third_party_api_authorizer" "otel" "graphql" "migrate" "migrate_document_zips" "zip_keys" "cleanup" "auditFiles")

for func in "${functions[@]}"; do
    # Count serverless HTTP endpoints for this function
    serverless_count=0
    for endpoint in "${serverless_endpoints[@]}"; do
        if [[ $endpoint == "$func|"* ]]; then
            ((serverless_count++))
        fi
    done
    
    # Check if function has HTTP endpoints in serverless
    if [ $serverless_count -gt 0 ]; then
        printf "%-20s %-15s %-15s %-10s\n" "$func" "$serverless_count" "?" "?"
    else
        printf "%-20s %-15s %-15s %-10s\n" "$func" "0 (internal)" "?" "?"
    fi
done

echo ""
echo "${BLUE}Phase 4: Detailed Endpoint Breakdown${NC}"
echo "--------------------------------"

echo ""
echo "${GREEN}Serverless Endpoints by Function:${NC}"
for func in "${functions[@]}"; do
    func_endpoints=()
    for endpoint in "${serverless_endpoints[@]}"; do
        if [[ $endpoint == "$func|"* ]]; then
            func_endpoints+=("$endpoint")
        fi
    done
    
    if [ ${#func_endpoints[@]} -gt 0 ]; then
        echo ""
        echo "  $func (${#func_endpoints[@]} endpoints):"
        for endpoint in "${func_endpoints[@]}"; do
            IFS='|' read -r f method path <<< "$endpoint"
            echo "    $method $path"
        done
    fi
done

echo ""
echo "${BLUE}Phase 5: CDK Lambda Function Analysis${NC}"
echo "-----------------------------------"

# Check CDK lambda factory for function definitions
lambda_factory_file="lib/constructs/lambda/lambda-factory.ts"
if [ -f "$lambda_factory_file" ]; then
    echo "Analyzing CDK Lambda function definitions..."
    
    # Extract function names from HANDLER_MAP
    echo ""
    echo "${GREEN}CDK Functions in HANDLER_MAP:${NC}"
    grep "^[[:space:]]*[A-Z_]*:" "$lambda_factory_file" | while read -r line; do
        if echo "$line" | grep -q "^[[:space:]]*[A-Z_][A-Z_]*:[[:space:]]*{"; then
            func_name=$(echo "$line" | sed 's/:.*//' | xargs)
            echo "  - $func_name"
        fi
    done
else
    echo "${RED}CDK lambda-factory.ts not found${NC}"
fi

echo ""
echo "${BLUE}Phase 6: AWS CLI Deployment Verification${NC}"
echo "--------------------------------------"

echo "To verify deployed endpoints, run these commands:"
echo ""
echo "${YELLOW}# Get API Gateway ID${NC}"
echo "aws apigateway get-rest-apis --query 'items[?contains(name,\`api\`)].{Name:name,Id:id}' --output table"
echo ""
echo "${YELLOW}# Get deployed resources/endpoints${NC}"
echo "aws apigateway get-resources --rest-api-id \$API_ID --output table"
echo ""
echo "${YELLOW}# Count deployed endpoints${NC}"
echo "aws apigateway get-resources --rest-api-id \$API_ID --query 'length(items[?resourceMethods])'"

echo ""
echo "${GREEN}✅ Analysis Complete!${NC}"
echo ""
echo "${YELLOW}Summary:${NC}"
echo "- Serverless HTTP endpoints: ${#serverless_endpoints[@]}"
echo "- Functions with HTTP endpoints: $(echo "${serverless_endpoints[@]}" | tr ' ' '\n' | cut -d'|' -f1 | sort -u | wc -l)"
echo "- CDK comparison: Run AWS CLI commands above to verify deployed endpoints"

echo ""
echo "${BLUE}Next Steps:${NC}"
echo "1. Run AWS CLI commands to get actual deployed endpoint count"
echo "2. Compare serverless vs CDK deployed endpoints"
echo "3. Identify any missing or extra endpoints in CDK"
echo "4. Fix CDK configuration to match serverless exactly"