#!/bin/bash
set -euo pipefail

# CI-friendly version of GuardDuty test script
# Configuration
STAGE="${1:-dev}"
REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Testing GuardDuty Malware Protection for S3 - Stage: $STAGE"
echo "Region: $REGION"
echo ""

# Get bucket names from CloudFormation
get_stack_output() {
  local stack=$1
  local output_key=$2
  aws cloudformation describe-stacks \
    --stack-name "$stack" \
    --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
    --output text 2>/dev/null || echo ""
}

# Get bucket names
DOCUMENTS_BUCKET=$(get_stack_output "MCR-Data-${STAGE}-cdk" "DocumentUploadsBucketName")
QA_BUCKET=$(get_stack_output "MCR-Data-${STAGE}-cdk" "QAUploadsBucketName")

if [ -z "$DOCUMENTS_BUCKET" ]; then
  echo "Error: Could not find Documents bucket"
  exit 1
fi

echo "Using buckets:"
echo "  Documents: $DOCUMENTS_BUCKET"
echo "  QA: $QA_BUCKET"

# Test 1: Upload a clean file
echo ""
echo "Test 1: Uploading clean file..."
echo "This is a clean test file for GuardDuty scanning" > /tmp/clean-test.txt
aws s3 cp /tmp/clean-test.txt "s3://${DOCUMENTS_BUCKET}/test/clean-test.txt"
echo "Uploaded clean file to s3://${DOCUMENTS_BUCKET}/test/clean-test.txt"

# Test 2: Upload EICAR test malware (if available)
EICAR_FILE="${SCRIPT_DIR}/../cypress/fixtures/documents/eicar_com.pdf"
if [ -f "$EICAR_FILE" ]; then
  echo ""
  echo "Test 2: Uploading EICAR test malware..."
  aws s3 cp "$EICAR_FILE" "s3://${DOCUMENTS_BUCKET}/test/eicar-test.pdf"
  echo "Uploaded EICAR test file to s3://${DOCUMENTS_BUCKET}/test/eicar-test.pdf"
else
  echo "Warning: EICAR test file not found at $EICAR_FILE"
fi

# Wait for GuardDuty to process
echo ""
echo "Waiting 30 seconds for GuardDuty to scan files..."
sleep 30

# Check tags on uploaded files
echo ""
echo "Checking scan results via S3 tags..."

# Function to check tags
check_tags() {
  local key=$1
  local expected_status=$2
  echo ""
  echo "Tags for $key:"
  local tags=$(aws s3api get-object-tagging \
    --bucket "$DOCUMENTS_BUCKET" \
    --key "$key" \
    --query 'TagSet' \
    --output json 2>/dev/null || echo "{}")
  
  if [ "$tags" = "{}" ] || [ "$tags" = "[]" ]; then
    echo "  No tags found yet"
    return 1
  else
    echo "$tags" | jq -r '.[] | "  \(.Key): \(.Value)"'
    
    # Check specifically for GuardDuty scan status
    local scan_status=$(echo "$tags" | jq -r '.[] | select(.Key=="GuardDutyMalwareScanStatus") | .Value')
    if [ -n "$scan_status" ]; then
      echo "  Scan Result: $scan_status"
      
      # Verify expected status
      if [ "$scan_status" = "$expected_status" ]; then
        echo "  ✓ Status matches expected: $expected_status"
        return 0
      else
        echo "  ✗ Status mismatch! Expected: $expected_status, Got: $scan_status"
        return 1
      fi
    else
      echo "  ✗ No GuardDuty scan status tag found"
      return 1
    fi
  fi
}

# Track test results
TEST_PASSED=true

# Check clean file
if ! check_tags "test/clean-test.txt" "NO_THREATS_FOUND"; then
  TEST_PASSED=false
fi

# Check EICAR file if it was uploaded
if [ -f "$EICAR_FILE" ]; then
  if ! check_tags "test/eicar-test.pdf" "THREATS_FOUND"; then
    TEST_PASSED=false
  fi
fi

# Check EventBridge for scan events
echo ""
echo "Checking for GuardDuty EventBridge rules..."
rules=$(aws events list-rules \
  --name-prefix "DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3" \
  --query 'Rules[].Name' \
  --output text 2>/dev/null)

if [ -n "$rules" ]; then
  echo "Found GuardDuty rules:"
  echo "$rules" | tr '\t' '\n' | sed 's/^/  - /'
else
  echo "No GuardDuty EventBridge rules found"
  TEST_PASSED=false
fi

# Check GuardDuty findings
echo ""
echo "Checking GuardDuty findings..."
DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text 2>/dev/null)
if [ -n "$DETECTOR_ID" ] && [ "$DETECTOR_ID" != "None" ]; then
  echo "Detector ID: $DETECTOR_ID"
  
  # Get recent findings
  findings=$(aws guardduty list-findings \
    --detector-id "$DETECTOR_ID" \
    --finding-criteria '{"Criterion":{"type":{"Equals":["Execution:S3/MaliciousFile"]}}}' \
    --max-results 5 \
    --query 'FindingIds' \
    --output json 2>/dev/null || echo "[]")
  
  if [ "$findings" != "[]" ]; then
    echo "Found malware findings:"
    echo "$findings" | jq -r '.[]' | head -5 | sed 's/^/  - /'
  else
    echo "No malware findings yet"
  fi
else
  echo "GuardDuty detector not found or not enabled"
  TEST_PASSED=false
fi

# Cleanup test files (always in CI)
echo ""
echo "Cleaning up test files..."
aws s3 rm "s3://${DOCUMENTS_BUCKET}/test/clean-test.txt" 2>/dev/null || true
aws s3 rm "s3://${DOCUMENTS_BUCKET}/test/eicar-test.pdf" 2>/dev/null || true
rm -f /tmp/clean-test.txt
echo "Test files cleaned up"

# Summary
echo ""
echo "================================================================"
echo "Test Summary:"
echo "----------------------------------------------------------------"

if [ "$TEST_PASSED" = true ]; then
  echo "✅ All GuardDuty malware protection tests passed!"
  echo "================================================================"
  exit 0
else
  echo "❌ Some GuardDuty malware protection tests failed!"
  echo "Please check the output above for details."
  echo "================================================================"
  exit 1
fi