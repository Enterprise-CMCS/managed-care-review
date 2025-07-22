# Local Development Setup for CDK

## Environment Variables

For local development, you need to set the following environment variables:

### Required Variables

1. **AWS Account ID** - Set one of these:
   - `CDK_DEFAULT_ACCOUNT` - Preferred method, matches GitHub Actions
   - `DEV_ACCOUNT_ID` - Stage-specific account ID
   - `AWS_ACCOUNT_ID` - Generic fallback

2. **AWS Region**:
   - `AWS_REGION` - Required (e.g., `us-east-1`)

### Example .env.local file

Create a `.env.local` file in the `services/infra-cdk` directory:

```bash
# AWS Account Configuration
CDK_DEFAULT_ACCOUNT=123456789012
AWS_REGION=us-east-1

# Optional: Stage-specific account IDs
DEV_ACCOUNT_ID=123456789012
VAL_ACCOUNT_ID=234567890123
PROD_ACCOUNT_ID=345678901234

# Optional: Other configurations
SAML_METADATA_URL=https://example.com/saml/metadata
VIRUS_SCAN_ALERT_EMAIL=alerts@example.com
IAM_PATH=/delegatedadmin/developer/
IAM_PERMISSIONS_BOUNDARY=arn:aws:iam::123456789012:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy
```

### Loading Environment Variables

```bash
# Load environment variables
source .env.local

# Or use dotenv
npm install -g dotenv-cli
dotenv -e .env.local cdk synth
```

## Running CDK Commands

```bash
# Synthesize the stack
cdk synth --context stage=dev

# Deploy a specific stack
cdk deploy MCR-Network-dev --context stage=dev

# Deploy all stacks
cdk deploy --all --context stage=dev
```

## GitHub Actions Integration

In GitHub Actions, the `CDK_DEFAULT_ACCOUNT` is automatically set from the `secrets.AWS_ACCOUNT_ID` secret. No additional configuration is needed.

## VPC Configuration

The VPC configuration is read from SSM Parameter Store:
- `/configuration/default/vpc/id` - VPC ID
- `/configuration/default/vpc/private-subnet-ids` - Comma-separated list of private subnet IDs
- `/configuration/default/vpc/availability-zones` - Comma-separated list of availability zones

These parameters must exist in your AWS account before running CDK. The CDK reads them during deployment.

### Creating SSM Parameters (if not already exist)

```bash
# Example: Creating SSM parameters for VPC configuration
aws ssm put-parameter --name "/configuration/default/vpc/id" --value "vpc-12345678" --type String
aws ssm put-parameter --name "/configuration/default/vpc/private-subnet-ids" --value "subnet-12345678,subnet-87654321,subnet-11111111" --type String
aws ssm put-parameter --name "/configuration/default/vpc/availability-zones" --value "us-east-1a,us-east-1b,us-east-1c" --type String
```

## Security Groups

Security groups are created by the CDK NetworkStack and are not imported. This ensures:
- Consistent security group configuration
- Proper ingress/egress rules
- Clean infrastructure as code