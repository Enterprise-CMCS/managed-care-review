#!/bin/bash

# Test Data Setup Script for MCR CDK Infrastructure
# Creates test users, documents, and data for integration testing

set -e

STAGE=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
TEST_RUN_ID=$(date +%s)
NUM_TEST_USERS=${2:-10}
NUM_TEST_DOCS=${3:-50}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔧 MCR Test Data Setup"
echo "====================="
echo "Stage: $STAGE"
echo "Test Users: $NUM_TEST_USERS"
echo "Test Documents: $NUM_TEST_DOCS"
echo "Test Run ID: $TEST_RUN_ID"
echo ""

# Function to create test users in Cognito
create_test_users() {
    echo -e "\n${BLUE}Creating test users in Cognito...${NC}"
    
    # Get User Pool ID
    USER_POOL_ID=$(aws cognito-idp list-user-pools \
        --max-results 60 \
        --query "UserPools[?contains(Name, 'mcr-$STAGE')].Id" \
        --output text | head -n1)
    
    if [ -z "$USER_POOL_ID" ]; then
        echo -e "${RED}Error: Cognito User Pool not found${NC}"
        return 1
    fi
    
    echo "Using User Pool: $USER_POOL_ID"
    
    # Create test users
    for i in $(seq 1 $NUM_TEST_USERS); do
        username="testuser${i}_${TEST_RUN_ID}"
        email="testuser${i}_${TEST_RUN_ID}@example.com"
        temp_password="TempPass123!"
        
        # Create user
        if aws cognito-idp admin-create-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$username" \
            --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
            --temporary-password "$temp_password" \
            --message-action SUPPRESS \
            2>/dev/null; then
            echo -e "${GREEN}✓${NC} Created user: $username"
            
            # Set permanent password
            aws cognito-idp admin-set-user-password \
                --user-pool-id "$USER_POOL_ID" \
                --username "$username" \
                --password "TestPass123!" \
                --permanent \
                2>/dev/null || true
        else
            echo -e "${YELLOW}!${NC} User might already exist: $username"
        fi
    done
}

# Function to create test documents
create_test_documents() {
    echo -e "\n${BLUE}Creating test documents in S3...${NC}"
    
    BUCKET_NAME="uploads-$STAGE-uploads"
    TEST_DATA_DIR="./test-data-$TEST_RUN_ID"
    mkdir -p "$TEST_DATA_DIR"
    
    # Document types and sizes
    declare -a DOC_TYPES=("pdf" "docx" "txt" "png" "jpg")
    declare -a DOC_SIZES=("small" "medium" "large")
    
    for i in $(seq 1 $NUM_TEST_DOCS); do
        # Random document type and size
        doc_type=${DOC_TYPES[$RANDOM % ${#DOC_TYPES[@]}]}
        doc_size=${DOC_SIZES[$RANDOM % ${#DOC_SIZES[@]}]}
        
        filename="test-doc-${i}-${TEST_RUN_ID}.${doc_type}"
        filepath="$TEST_DATA_DIR/$filename"
        
        # Create document based on type
        case $doc_type in
            pdf)
                # Create a simple PDF
                echo "%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Test Document $i) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
356
%%EOF" > "$filepath"
                ;;
            
            docx)
                # Create a simple text file (would need proper DOCX in production)
                echo "Test Document $i - Type: DOCX - Size: $doc_size" > "$filepath"
                ;;
            
            txt)
                # Create text file with varying content
                case $doc_size in
                    small)
                        echo "Small test document $i with minimal content." > "$filepath"
                        ;;
                    medium)
                        for j in {1..100}; do
                            echo "Line $j of medium test document $i." >> "$filepath"
                        done
                        ;;
                    large)
                        for j in {1..1000}; do
                            echo "Line $j of large test document $i with more content to simulate real documents." >> "$filepath"
                        done
                        ;;
                esac
                ;;
            
            png|jpg)
                # Create a simple image file
                # In production, use ImageMagick: convert -size 100x100 xc:white "$filepath"
                echo "Simulated image file $i" > "$filepath"
                ;;
        esac
        
        # Upload to S3
        user_id="testuser$((i % NUM_TEST_USERS + 1))_${TEST_RUN_ID}"
        s3_key="users/$user_id/documents/$filename"
        
        if aws s3 cp "$filepath" "s3://$BUCKET_NAME/$s3_key" \
            --metadata "user=$user_id,doctype=$doc_type,testrun=$TEST_RUN_ID" \
            2>/dev/null; then
            echo -e "${GREEN}✓${NC} Uploaded: $filename (${doc_type}, ${doc_size})"
        else
            echo -e "${RED}✗${NC} Failed to upload: $filename"
        fi
    done
    
    # Cleanup local files
    rm -rf "$TEST_DATA_DIR"
}

# Function to create test database data
create_test_database_data() {
    echo -e "\n${BLUE}Creating test data in database...${NC}"
    
    # Create a Lambda payload to insert test data
    db_payload=$(cat << EOF
{
    "action": "createTestData",
    "testRunId": "$TEST_RUN_ID",
    "numUsers": $NUM_TEST_USERS,
    "numDocuments": $NUM_TEST_DOCS,
    "data": {
        "users": $(seq 1 $NUM_TEST_USERS | jq -R . | jq -s .),
        "documentTypes": ["pdf", "docx", "txt", "png", "jpg"],
        "statuses": ["pending", "processing", "completed", "failed"]
    }
}
EOF
)
    
    # Save payload
    echo "$db_payload" > /tmp/db-test-payload.json
    
    # Invoke database manager function
    if aws lambda invoke \
        --function-name "postgres-$STAGE-dbManager" \
        --payload file:///tmp/db-test-payload.json \
        /tmp/db-test-response.json 2>/dev/null; then
        
        if grep -q '"success":true' /tmp/db-test-response.json 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Database test data created successfully"
        else
            echo -e "${YELLOW}!${NC} Database function returned but might have failed"
            cat /tmp/db-test-response.json
        fi
    else
        echo -e "${RED}✗${NC} Failed to invoke database manager function"
    fi
    
    # Cleanup
    rm -f /tmp/db-test-payload.json /tmp/db-test-response.json
}

# Function to create test API keys
create_test_api_keys() {
    echo -e "\n${BLUE}Creating test API keys...${NC}"
    
    # Get API ID
    API_ID=$(aws apigateway get-rest-apis \
        --query "items[?name=='infra-api-$STAGE-app-api-gateway'].id" \
        --output text)
    
    if [ -z "$API_ID" ]; then
        echo -e "${YELLOW}!${NC} API Gateway not found, skipping API key creation"
        return
    fi
    
    # Create usage plan if it doesn't exist
    USAGE_PLAN_ID=$(aws apigateway get-usage-plans \
        --query "items[?name=='test-usage-plan-$STAGE'].id" \
        --output text)
    
    if [ -z "$USAGE_PLAN_ID" ]; then
        USAGE_PLAN_ID=$(aws apigateway create-usage-plan \
            --name "test-usage-plan-$STAGE" \
            --description "Test usage plan for $STAGE" \
            --throttle burstLimit=100,rateLimit=50 \
            --quota limit=10000,period=DAY \
            --query 'id' \
            --output text)
        echo "Created usage plan: $USAGE_PLAN_ID"
    fi
    
    # Create API keys for test users
    for i in $(seq 1 3); do
        key_name="test-api-key-${i}-${TEST_RUN_ID}"
        
        API_KEY_ID=$(aws apigateway create-api-key \
            --name "$key_name" \
            --description "Test API key $i for run $TEST_RUN_ID" \
            --enabled \
            --query 'id' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$API_KEY_ID" ]; then
            echo -e "${GREEN}✓${NC} Created API key: $key_name"
            
            # Associate with usage plan
            aws apigateway create-usage-plan-key \
                --usage-plan-id "$USAGE_PLAN_ID" \
                --key-id "$API_KEY_ID" \
                --key-type "API_KEY" 2>/dev/null || true
        fi
    done
}

# Function to create test virus files
create_test_virus_files() {
    echo -e "\n${BLUE}Creating test virus files for scanning...${NC}"
    
    BUCKET_NAME="uploads-$STAGE-uploads"
    
    # EICAR test string (safe test virus)
    EICAR='X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    
    # Create multiple test files
    for i in {1..5}; do
        filename="virus-test-${i}-${TEST_RUN_ID}.txt"
        echo "$EICAR" > "/tmp/$filename"
        
        # Upload to trigger virus scan
        if aws s3 cp "/tmp/$filename" "s3://$BUCKET_NAME/virus-tests/$filename" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Uploaded virus test file: $filename"
        else
            echo -e "${RED}✗${NC} Failed to upload virus test file: $filename"
        fi
        
        rm -f "/tmp/$filename"
    done
    
    echo "  Virus scan should trigger automatically for these files"
}

# Function to seed performance test data
seed_performance_data() {
    echo -e "\n${BLUE}Seeding data for performance testing...${NC}"
    
    # Create a variety of file sizes for performance testing
    BUCKET_NAME="uploads-$STAGE-uploads"
    PERF_DIR="./perf-data-$TEST_RUN_ID"
    mkdir -p "$PERF_DIR"
    
    # File sizes: 1KB, 10KB, 100KB, 1MB, 10MB
    declare -a SIZES=("1" "10" "100" "1024" "10240")
    declare -a SIZE_NAMES=("1KB" "10KB" "100KB" "1MB" "10MB")
    
    for idx in "${!SIZES[@]}"; do
        size=${SIZES[$idx]}
        size_name=${SIZE_NAMES[$idx]}
        
        for i in {1..5}; do
            filename="perf-test-${size_name}-${i}-${TEST_RUN_ID}.bin"
            filepath="$PERF_DIR/$filename"
            
            # Create file of specific size
            dd if=/dev/urandom of="$filepath" bs=1024 count=$size 2>/dev/null
            
            # Upload to S3
            if aws s3 cp "$filepath" "s3://$BUCKET_NAME/performance-tests/$filename" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} Uploaded performance test file: $filename (${size_name})"
            else
                echo -e "${RED}✗${NC} Failed to upload: $filename"
            fi
        done
    done
    
    # Cleanup
    rm -rf "$PERF_DIR"
}

# Function to verify test data
verify_test_data() {
    echo -e "\n${YELLOW}Verifying test data creation...${NC}"
    
    # Check S3 objects
    BUCKET_NAME="uploads-$STAGE-uploads"
    OBJECT_COUNT=$(aws s3 ls "s3://$BUCKET_NAME/" --recursive | grep "$TEST_RUN_ID" | wc -l)
    echo "  S3 Objects created: $OBJECT_COUNT"
    
    # Check Cognito users
    USER_POOL_ID=$(aws cognito-idp list-user-pools \
        --max-results 60 \
        --query "UserPools[?contains(Name, 'mcr-$STAGE')].Id" \
        --output text | head -n1)
    
    if [ -n "$USER_POOL_ID" ]; then
        USER_COUNT=$(aws cognito-idp list-users \
            --user-pool-id "$USER_POOL_ID" \
            --filter "username ^= \"testuser\"" \
            --query 'Users | length(@)' \
            --output text 2>/dev/null || echo "0")
        echo "  Cognito test users: $USER_COUNT"
    fi
    
    # Generate summary report
    cat > "test-data-summary-$TEST_RUN_ID.json" << EOF
{
    "testRunId": "$TEST_RUN_ID",
    "stage": "$STAGE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "created": {
        "users": $NUM_TEST_USERS,
        "documents": $NUM_TEST_DOCS,
        "s3Objects": $OBJECT_COUNT,
        "virusTestFiles": 5,
        "performanceTestFiles": 25
    }
}
EOF
    
    echo -e "\n${GREEN}Test data setup complete!${NC}"
    echo "Summary saved to: test-data-summary-$TEST_RUN_ID.json"
}

# Function to cleanup old test data
cleanup_old_test_data() {
    echo -e "\n${BLUE}Cleaning up old test data (optional)...${NC}"
    
    read -p "Do you want to clean up test data older than 7 days? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Calculate date 7 days ago
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            OLD_DATE=$(date -v-7d +%s)
        else
            # Linux
            OLD_DATE=$(date -d '7 days ago' +%s)
        fi
        
        # Clean S3 objects
        BUCKET_NAME="uploads-$STAGE-uploads"
        echo "Cleaning S3 objects older than 7 days..."
        
        aws s3 ls "s3://$BUCKET_NAME/" --recursive | while read -r line; do
            if [[ "$line" =~ test.*_([0-9]+)\. ]]; then
                timestamp="${BASH_REMATCH[1]}"
                if [ "$timestamp" -lt "$OLD_DATE" ]; then
                    key=$(echo "$line" | awk '{print $4}')
                    aws s3 rm "s3://$BUCKET_NAME/$key" 2>/dev/null && \
                        echo -e "${GREEN}✓${NC} Deleted: $key"
                fi
            fi
        done
        
        echo "Cleanup complete!"
    fi
}

# Main execution
main() {
    echo "Starting test data setup..."
    
    # Create test users
    create_test_users
    
    # Create test documents
    create_test_documents
    
    # Create database test data
    create_test_database_data
    
    # Create API keys
    create_test_api_keys
    
    # Create virus test files
    create_test_virus_files
    
    # Seed performance data
    seed_performance_data
    
    # Verify creation
    verify_test_data
    
    # Optional cleanup
    cleanup_old_test_data
    
    echo -e "\n${GREEN}Test data setup completed successfully!${NC}"
    echo "Test Run ID: $TEST_RUN_ID"
    echo ""
    echo "You can now run:"
    echo "  ./scripts/integration-test.sh $STAGE"
    echo "  ./scripts/load-test.sh $STAGE"
}

# Run main function
main
