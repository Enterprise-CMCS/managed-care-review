#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print section headers
print_header() {
    echo ""
    echo "========================================"
    print_status "$BLUE" "$1"
    echo "========================================"
}

# Check if stage is provided
if [ -z "$1" ]; then
    print_status "$RED" "Error: Stage parameter required"
    echo "Usage: ./deploy-complete.sh <stage>"
    echo "Example: ./deploy-complete.sh dev"
    exit 1
fi

STAGE=$1

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|val|prod)$ ]]; then
    print_status "$RED" "Error: Invalid stage. Must be dev, val, or prod"
    exit 1
fi

print_header "MCR CDK Complete Infrastructure Deployment"
print_status "$GREEN" "Stage: $STAGE"

# Step 1: Validate environment
print_header "Step 1: Validating Environment"
./scripts/validate-env.sh $STAGE
if [ $? -ne 0 ]; then
    print_status "$RED" "Environment validation failed"
    exit 1
fi
print_status "$GREEN" "✓ Environment validated"

# Step 2: Build Lambda layers
print_header "Step 2: Building Lambda Layers"
./scripts/build-layers.sh
if [ $? -ne 0 ]; then
    print_status "$RED" "Lambda layer build failed"
    exit 1
fi
print_status "$GREEN" "✓ Lambda layers built"

# Step 3: Install dependencies
print_header "Step 3: Installing Dependencies"
npm install
if [ $? -ne 0 ]; then
    print_status "$RED" "Dependency installation failed"
    exit 1
fi
print_status "$GREEN" "✓ Dependencies installed"

# Step 4: Build TypeScript
print_header "Step 4: Building TypeScript"
npm run build
if [ $? -ne 0 ]; then
    print_status "$RED" "TypeScript build failed"
    exit 1
fi
print_status "$GREEN" "✓ TypeScript built"

# Step 5: Run CDK synth to validate
print_header "Step 5: Synthesizing CDK App"
npx cdk synth --context stage=$STAGE
if [ $? -ne 0 ]; then
    print_status "$RED" "CDK synthesis failed"
    exit 1
fi
print_status "$GREEN" "✓ CDK app synthesized"

# Step 6: Bootstrap CDK (if needed)
print_header "Step 6: Checking CDK Bootstrap"
if ! npx cdk bootstrap --context stage=$STAGE 2>&1 | grep -q "already bootstrapped"; then
    print_status "$YELLOW" "Bootstrapping CDK..."
    npx cdk bootstrap --context stage=$STAGE
    print_status "$GREEN" "✓ CDK bootstrapped"
else
    print_status "$GREEN" "✓ CDK already bootstrapped"
fi

# Step 7: Deploy stacks in order
print_header "Step 7: Deploying CDK Stacks"

deploy_stack() {
    local stack_name=$1
    local description=$2
    
    print_status "$YELLOW" "Deploying $description..."
    npx cdk deploy $stack_name --context stage=$STAGE --require-approval never
    if [ $? -ne 0 ]; then
        print_status "$RED" "Failed to deploy $stack_name"
        exit 1
    fi
    print_status "$GREEN" "✓ $description deployed"
}

# Deploy stacks in dependency order
deploy_stack "MCR-Foundation-$STAGE" "Foundation Stack"
deploy_stack "MCR-Network-$STAGE" "Network Stack"

# Deploy Data and Auth in parallel (they don't depend on each other)
print_status "$YELLOW" "Deploying Data and Auth stacks in parallel..."
npx cdk deploy MCR-Data-$STAGE MCR-Auth-$STAGE --context stage=$STAGE --require-approval never --concurrency 2
if [ $? -ne 0 ]; then
    print_status "$RED" "Failed to deploy Data/Auth stacks"
    exit 1
fi
print_status "$GREEN" "✓ Data and Auth stacks deployed"

deploy_stack "MCR-Compute-$STAGE" "Compute Stack"
deploy_stack "MCR-Api-$STAGE" "API Stack"

# Deploy Database Operations, Virus Scanning, and Monitoring in parallel
print_status "$YELLOW" "Deploying Database Operations, Virus Scanning, and Monitoring stacks in parallel..."
npx cdk deploy MCR-DatabaseOps-$STAGE MCR-VirusScanning-$STAGE MCR-Monitoring-$STAGE --context stage=$STAGE --require-approval never --concurrency 3
if [ $? -ne 0 ]; then
    print_status "$RED" "Failed to deploy Database Operations/Virus Scanning/Monitoring stacks"
    exit 1
fi
print_status "$GREEN" "✓ Database Operations, Virus Scanning, and Monitoring stacks deployed"

# Step 8: Output summary
print_header "Deployment Complete!"

print_status "$GREEN" "All stacks have been successfully deployed for stage: $STAGE"
echo ""
echo "Stack deployment summary:"
echo "  1. Foundation Stack - Base infrastructure"
echo "  2. Network Stack - VPC and networking"
echo "  3. Data Stack - Aurora database and S3 buckets"
echo "  4. Auth Stack - Cognito user pool"
echo "  5. Compute Stack - Lambda functions"
echo "  6. API Stack - API Gateway"
echo "  7. Database Operations Stack - DB rotation, export/import"
echo "  8. Virus Scanning Stack - ClamAV infrastructure"
echo "  9. Monitoring Stack - CloudWatch and New Relic"
echo ""
echo "To view stack outputs:"
echo "  aws cloudformation describe-stacks --stack-name MCR-*-$STAGE --query 'Stacks[*].Outputs'"
echo ""
echo "To destroy all stacks (BE CAREFUL!):"
echo "  npx cdk destroy --all --context stage=$STAGE"
