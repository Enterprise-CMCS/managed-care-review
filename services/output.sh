#!/bin/bash
set -e
# This script queries CloudFormation outputs from CDK stacks
help='This script is run with the format  ./output.sh <target service name> <output variable name> <stage name (optional, default dev)>'
example='ex.  ./output.sh ui CloudFrontEndpointUrl'

: "${1?ERROR: 'You must specify the target service.'
$help
$example}"
: "${2?ERROR: "You must specify the variable you want to fetch from the stack output"
$help
$example}"

service=${1}
output=${2}
stage=${3:-dev}

if [ "$output" == "url" ]; then
  output="CloudFrontEndpointUrl"
fi

# CDK stack naming pattern: ${service}-${stage}-cdk
cdk_stack_name="${service}-${stage}-cdk"

# Query CDK stack outputs using AWS CLI
aws cloudformation describe-stacks \
  --stack-name "$cdk_stack_name" \
  --query "Stacks[0].Outputs[?OutputKey=='${cdk_stack_name}-${output}'].OutputValue" \
  --output text
