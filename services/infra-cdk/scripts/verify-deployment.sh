#!/bin/bash

# CDK Infrastructure Verification Script
# This script verifies that all components are deployed correctly

set -e

STAGE=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "🔍 Verifying CDK Infrastructure for stage: $STAGE"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a resource exists
check_resource() {
    local resource_type=$1
    local resource_name=$2
    local check_command=$3
    
    echo -n "Checking $resource_type: $resource_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Check Lambda Functions
echo -e "\n${YELLOW}Lambda Functions:${NC}"
check_resource "Lambda" "postgres-$STAGE-rotator" "aws lambda get-function --function-name postgres-$STAGE-rotator"
check_resource "Lambda" "postgres-$STAGE-dbManager" "aws lambda get-function --function-name postgres-$STAGE-dbManager"
check_resource "Lambda" "postgres-$STAGE-dbExport" "aws lambda get-function --function-name postgres-$STAGE-dbExport"
check_resource "Lambda" "postgres-$STAGE-dbImport" "aws lambda get-function --function-name postgres-$STAGE-dbImport"
check_resource "Lambda" "uploads-$STAGE-avScan" "aws lambda get-function --function-name uploads-$STAGE-avScan"
check_resource "Lambda" "uploads-$STAGE-rescanFailedFiles" "aws lambda get-function --function-name uploads-$STAGE-rescanFailedFiles"
check_resource "Lambda" "uploads-$STAGE-rescanWorker" "aws lambda get-function --function-name uploads-$STAGE-rescanWorker"

# Check Lambda Layers
echo -e "\n${YELLOW}Lambda Layers:${NC}"
LAYERS=$(aws lambda list-layers --query "Layers[?contains(LayerName, '$STAGE')].LayerName" --output text)
for layer in $LAYERS; do
    echo -e "  ${GREEN}✓${NC} $layer"
done

# Check S3 Buckets
echo -e "\n${YELLOW}S3 Buckets:${NC}"
check_resource "S3 Bucket" "uploads-$STAGE-uploads" "aws s3api head-bucket --bucket uploads-$STAGE-uploads"
check_resource "S3 Bucket" "uploads-$STAGE-qa" "aws s3api head-bucket --bucket uploads-$STAGE-qa"

# Check Auto Scaling Group
echo -e "\n${YELLOW}Auto Scaling Group:${NC}"
ASG_NAME=$(aws autoscaling describe-auto-scaling-groups --query "AutoScalingGroups[?contains(AutoScalingGroupName, 'MCR-VirusScanning-$STAGE-ClamAvASG')].AutoScalingGroupName" --output text)
if [ -n "$ASG_NAME" ]; then
    echo -e "  ${GREEN}✓${NC} ClamAV Auto Scaling Group: $ASG_NAME"
    
    # Get ASG details
    ASG_INFO=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG_NAME" --query 'AutoScalingGroups[0].{MinSize:MinSize,MaxSize:MaxSize,DesiredCapacity:DesiredCapacity,Instances:length(Instances)}' --output json)
    echo "    Configuration: $ASG_INFO"
else
    echo -e "  ${RED}✗${NC} ClamAV Auto Scaling Group not found"
fi

# Check Network Load Balancer
echo -e "\n${YELLOW}Network Load Balancer:${NC}"
NLB_ARN=$(aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(LoadBalancerName, 'MCR-VirusScanning-$STAGE') && contains(LoadBalancerName, 'ClamAvNLB')].LoadBalancerArn" --output text)
if [ -n "$NLB_ARN" ]; then
    echo -e "  ${GREEN}✓${NC} ClamAV Network Load Balancer found"
    
    # Check target health
    TG_ARN=$(aws elbv2 describe-target-groups --load-balancer-arn "$NLB_ARN" --query 'TargetGroups[0].TargetGroupArn' --output text)
    if [ -n "$TG_ARN" ]; then
        HEALTH=$(aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --query 'TargetHealthDescriptions[*].TargetHealth.State' --output text)
        echo "    Target Health: $HEALTH"
    fi
else
    echo -e "  ${RED}✗${NC} ClamAV Network Load Balancer not found"
fi

# Check Database
echo -e "\n${YELLOW}Database:${NC}"
DB_CLUSTER=$(aws rds describe-db-clusters --query "DBClusters[?contains(DBClusterIdentifier, 'postgres-$STAGE')].DBClusterIdentifier" --output text)
if [ -n "$DB_CLUSTER" ]; then
    echo -e "  ${GREEN}✓${NC} Aurora PostgreSQL Cluster: $DB_CLUSTER"
else
    echo -e "  ${RED}✗${NC} Aurora PostgreSQL Cluster not found"
fi

# Check Secrets
echo -e "\n${YELLOW}Secrets Manager:${NC}"
check_resource "Secret" "aurora_postgres_${STAGE}_master" "aws secretsmanager describe-secret --secret-id aurora_postgres_${STAGE}_master"
check_resource "Secret" "api_jwt_secret_$STAGE" "aws secretsmanager describe-secret --secret-id api_jwt_secret_$STAGE"

# Check if rotation is enabled
ROTATION_ENABLED=$(aws secretsmanager describe-secret --secret-id "aurora_postgres_${STAGE}_master" --query 'RotationEnabled' --output text 2>/dev/null || echo "false")
if [ "$ROTATION_ENABLED" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} Secret rotation is enabled"
else
    echo -e "  ${YELLOW}!${NC} Secret rotation is not enabled (expected for dev)"
fi

# Check API Gateway
echo -e "\n${YELLOW}API Gateway:${NC}"
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='infra-api-$STAGE-app-api-gateway'].id" --output text)
if [ -n "$API_ID" ]; then
    echo -e "  ${GREEN}✓${NC} API Gateway: $API_ID"
    echo "    Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE"
else
    echo -e "  ${RED}✗${NC} API Gateway not found"
fi

# Check WAF
echo -e "\n${YELLOW}WAF:${NC}"
WAF_ARN=$(aws wafv2 list-web-acls --scope REGIONAL --query "WebACLs[?contains(Name, '$STAGE-infra-api-webacl')].ARN" --output text)
if [ -n "$WAF_ARN" ]; then
    echo -e "  ${GREEN}✓${NC} WAF Web ACL found"
else
    echo -e "  ${RED}✗${NC} WAF Web ACL not found"
fi

# Check Route53 Private Hosted Zone
echo -e "\n${YELLOW}Route53:${NC}"
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='mc-review.local.'].Id" --output text)
if [ -n "$ZONE_ID" ]; then
    echo -e "  ${GREEN}✓${NC} Private Hosted Zone: mc-review.local"
else
    echo -e "  ${RED}✗${NC} Private Hosted Zone not found"
fi

# Summary
echo -e "\n${YELLOW}================================================${NC}"
echo "Verification complete for stage: $STAGE"
echo -e "${YELLOW}================================================${NC}"

# Check if New Relic is configured for val/prod
if [ "$STAGE" = "val" ] || [ "$STAGE" = "prod" ]; then
    echo -e "\n${YELLOW}New Relic Monitoring:${NC}"
    check_resource "IAM Role" "NewRelicInfraIntegrations" "aws iam get-role --role-name NewRelicInfraIntegrations"
    check_resource "Kinesis Firehose" "NewRelic-Delivery-Stream" "aws firehose describe-delivery-stream --delivery-stream-name NewRelic-Delivery-Stream"
    check_resource "CloudWatch Metric Stream" "NewRelic-Metric-Stream" "aws cloudwatch describe-metric-streams --names NewRelic-Metric-Stream"
fi

echo -e "\n✅ Verification script completed!"
