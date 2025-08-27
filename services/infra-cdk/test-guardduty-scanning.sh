#!/bin/bash
set -euo pipefail

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
  echo ""
  echo "Tags for $key:"
  local tags=$(aws s3api get-object-tagging \
    --bucket "$DOCUMENTS_BUCKET" \
    --key "$key" \
    --query 'TagSet' \
    --output json 2>/dev/null || echo "{}")
  
  if [ "$tags" = "{}" ] || [ "$tags" = "[]" ]; then
    echo "  No tags found yet"
  else
    echo "$tags" | jq -r '.[] | "  \(.Key): \(.Value)"'
    
    # Check specifically for GuardDuty scan status
    local scan_status=$(echo "$tags" | jq -r '.[] | select(.Key=="GuardDutyMalwareScanStatus") | .Value')
    if [ -n "$scan_status" ]; then
      echo "  Scan Result: $scan_status"
      case "$scan_status" in
        "NO_THREATS_FOUND")
          echo "  ✓ File is clean"
          ;;
        "THREATS_FOUND")
          echo "  ⚠ Malware detected!"
          ;;
        "UNSUPPORTED")
          echo "  ℹ File type not supported for scanning"
          ;;
        "ACCESS_DENIED")
          echo "  ✗ Permission denied for scanning"
          ;;
        *)
          echo "  ? Unknown status: $scan_status"
          ;;
      esac
    fi
  fi
}

check_tags "test/clean-test.txt"
check_tags "test/eicar-test.pdf"

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
    
    # Get details of the first finding
    first_finding=$(echo "$findings" | jq -r '.[0]')
    if [ -n "$first_finding" ] && [ "$first_finding" != "null" ]; then
      echo ""
      echo "Details of most recent finding:"
      aws guardduty get-findings \
        --detector-id "$DETECTOR_ID" \
        --finding-ids "$first_finding" \
        --query 'Findings[0].{Title:Title,Severity:Severity,UpdatedAt:UpdatedAt}' \
        --output json | jq '.'
    fi
  else
    echo "No malware findings yet"
  fi
else
  echo "GuardDuty detector not found or not enabled"
fi

echo ""
echo "================================================================"
echo "Test complete. Summary:"
echo "----------------------------------------------------------------"
echo "Check the S3 console for GuardDutyMalwareScanStatus tags:"
echo "  - NO_THREATS_FOUND: File is clean"
echo "  - THREATS_FOUND: Malware detected"
echo "  - UNSUPPORTED: File type not supported"
echo "  - ACCESS_DENIED: Permission issues"
echo ""
echo "Note: It may take 1-2 minutes for GuardDuty to complete scanning"
echo "================================================================"

# Cleanup option
echo ""
read -p "Do you want to clean up test files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Cleaning up test files..."
  aws s3 rm "s3://${DOCUMENTS_BUCKET}/test/clean-test.txt" 2>/dev/null || true
  aws s3 rm "s3://${DOCUMENTS_BUCKET}/test/eicar-test.pdf" 2>/dev/null || true
  rm -f /tmp/clean-test.txt
  echo "Test files cleaned up"
fi