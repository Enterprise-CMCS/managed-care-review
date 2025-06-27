#!/bin/bash
# GuardDuty Migration Deployment Script
# This script helps deploy the GuardDuty migration in a safe, controlled manner

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGE=${1:-dev}
ENABLE_GUARDDUTY=${ENABLE_GUARDDUTY:-true}
AWS_REGION=${AWS_REGION:-us-east-1}

# Set required environment variables for OTEL
export VITE_APP_OTEL_COLLECTOR_URL=${VITE_APP_OTEL_COLLECTOR_URL:-"https://otel-collector.${STAGE}.cms.gov"}
export VIRUS_SCAN_ALERT_EMAIL=${VIRUS_SCAN_ALERT_EMAIL:-"security-alerts@cms.gov"}

echo -e "${GREEN}GuardDuty Migration Deployment Script${NC}"
echo -e "Stage: ${YELLOW}$STAGE${NC}"
echo -e "Region: ${YELLOW}$AWS_REGION${NC}"
echo ""

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Pre-deployment checks
echo -e "${YELLOW}Running pre-deployment checks...${NC}"

# Check AWS CLI
aws --version > /dev/null 2>&1
check_status "AWS CLI available"

# Check CDK
cdk --version > /dev/null 2>&1
check_status "CDK available"

# Check Node.js
node --version > /dev/null 2>&1
check_status "Node.js available"

# Build the project
echo -e "\n${YELLOW}Building CDK project...${NC}"
cd /Users/addistsegaye/repo/managed-care-review/services/infra-cdk
npm install
check_status "Dependencies installed"

npm run build
check_status "TypeScript compiled"

# Run CDK synth to validate
echo -e "\n${YELLOW}Validating CDK stacks...${NC}"
cdk synth --context stage=$STAGE > /dev/null
check_status "CDK synthesis successful"

# Check if GuardDuty is enabled in the account
echo -e "\n${YELLOW}Checking GuardDuty status...${NC}"
DETECTOR_COUNT=$(aws guardduty list-detectors --region $AWS_REGION --query 'length(DetectorIds)' --output text 2>/dev/null || echo "0")
if [ "$DETECTOR_COUNT" -eq "0" ]; then
    echo -e "${RED}Warning: GuardDuty is not enabled in this region${NC}"
    echo "Please enable GuardDuty first: aws guardduty create-detector --enable"
    exit 1
else
    echo -e "${GREEN}✓ GuardDuty is enabled${NC}"
fi

# Deploy GuardDuty stack
echo -e "\n${YELLOW}Deploying GuardDuty Malware Protection stack...${NC}"
cdk deploy MCR-GuardDuty-$STAGE \
    --context stage=$STAGE \
    --context enableGuardDuty=true \
    --require-approval never

check_status "GuardDuty stack deployed"

# Verify Malware Protection Plans
echo -e "\n${YELLOW}Verifying Malware Protection Plans...${NC}"
PLANS=$(aws guardduty list-malware-protection-plans --query 'length(Items)' --output text)
echo -e "Found ${GREEN}$PLANS${NC} Malware Protection Plans"

# Test file upload
echo -e "\n${YELLOW}Testing virus scanning...${NC}"
TEST_FILE="/tmp/guardduty-test-$(date +%s).txt"
echo "This is a test file for GuardDuty scanning" > $TEST_FILE

# Get bucket name
UPLOADS_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name MCR-Data-$STAGE \
    --query 'Stacks[0].Outputs[?OutputKey==`UploadsBucketName`].OutputValue' \
    --output text)

if [ -n "$UPLOADS_BUCKET" ]; then
    aws s3 cp $TEST_FILE s3://$UPLOADS_BUCKET/test/
    check_status "Test file uploaded"
    
    echo "Waiting 30 seconds for scan to complete..."
    sleep 30
    
    # Check tags
    TAGS=$(aws s3api get-object-tagging \
        --bucket $UPLOADS_BUCKET \
        --key test/$(basename $TEST_FILE) \
        --query 'TagSet[?Key==`GuardDutyMalwareScanStatus` || Key==`virusScanStatus`]' \
        --output json)
    
    echo -e "\nScan results:"
    echo "$TAGS" | jq .
    
    # Cleanup
    aws s3 rm s3://$UPLOADS_BUCKET/test/$(basename $TEST_FILE)
    rm -f $TEST_FILE
fi

# Display metrics dashboard URL
echo -e "\n${GREEN}Deployment complete!${NC}"
echo -e "\nCloudWatch Dashboard: ${YELLOW}https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=mcr-guardduty-malware-$STAGE${NC}"

# Show next steps
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Monitor the CloudWatch dashboard for scan metrics"
echo "2. Check comparison metrics after 1 hour"
echo "3. Verify email alerts are being received"
echo "4. Test rescan functionality with a failed scan"
echo ""
echo -e "${GREEN}GuardDuty migration is now active in dual-mode!${NC}"

# Optional: Run comparison report
read -p "Run initial comparison report? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Invoking comparison metrics Lambda...${NC}"
    aws lambda invoke \
        --function-name uploads-$STAGE-virus-scan-comparison \
        --invocation-type RequestResponse \
        --payload '{}' \
        /tmp/comparison-result.json
    
    echo -e "\nComparison results:"
    cat /tmp/comparison-result.json | jq .
fi
