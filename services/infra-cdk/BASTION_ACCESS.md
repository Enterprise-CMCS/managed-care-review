# PostgreSQL Bastion Host Access

## Overview

The CDK Postgres stack creates an optional bastion host for database access in dev/val/prod environments (not review environments). The bastion uses:

- **AWS Systems Manager Session Manager** (no SSH keys needed)
- **gp3 EBS volumes** (latest volume type)
- **PostgreSQL 16 client** pre-installed
- **Helper script** for easy database connection

## Environments

- **dev**: ✅ Bastion enabled
- **val**: ✅ Bastion enabled
- **prod**: ✅ Bastion enabled
- **review**: ❌ Bastion NOT created (uses shared dev cluster)

## Connecting to the Bastion

### Prerequisites

1. AWS CLI installed and configured
2. Session Manager plugin installed:

    ```bash
    # macOS
    brew install --cask session-manager-plugin

    # Or download from AWS:
    # https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
    ```

### Get the Instance ID

```bash
# From CDK outputs
aws cloudformation describe-stacks \
  --stack-name postgres-dev-cdk \
  --query 'Stacks[0].Outputs[?OutputKey==`BastionInstanceId`].OutputValue' \
  --output text

# Or using AWS CLI
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=postgres-dev-bastion" \
           "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text
```

### Start/Stop the Instance

```bash
# Start (if stopped to save costs)
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Wait for it to be running
aws ec2 wait instance-running --instance-ids i-1234567890abcdef0

# Stop when done
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
```

### Connect via SSM

```bash
# Connect to bastion
aws ssm start-session --target i-1234567890abcdef0

# You'll now be in a bash shell on the bastion
```

## Accessing the Database

Once connected to the bastion, you have two options:

### Option 1: Use the Helper Script (Easiest)

```bash
# The helper script automatically fetches credentials and connects
connect-db

# You're now in psql!
postgres=#
```

### Option 2: Manual Connection

```bash
# Get database endpoint from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:xxx:secret:postgres-dev-cdk-xxx \
  --query SecretString \
  --output text | jq .

# Connect manually
psql -h your-cluster.cluster-xxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d mcr_cdk_dev
```

## Common Database Tasks

```sql
-- List all databases
\l

-- Connect to a specific database
\c mcr_cdk_dev

-- List all tables
\dt

-- Describe a table
\d table_name

-- Export data to CSV
\copy (SELECT * FROM your_table) TO '/tmp/data.csv' CSV HEADER

-- Exit psql
\q
```

## Extracting Data

```bash
# On the bastion, export data to file
psql -h $DB_HOST -U postgres -d mcr_cdk_dev -c "\copy (SELECT * FROM submissions LIMIT 1000) TO '/tmp/submissions.csv' CSV HEADER"

# Download from bastion to your local machine (in a new terminal on your laptop)
# First, find the instance's private IP
aws ec2 describe-instances \
  --instance-ids i-1234567890abcdef0 \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' \
  --output text

# Use S3 as intermediary (recommended)
# On bastion:
aws s3 cp /tmp/submissions.csv s3://your-temp-bucket/submissions.csv

# On your laptop:
aws s3 cp s3://your-temp-bucket/submissions.csv ./submissions.csv
aws s3 rm s3://your-temp-bucket/submissions.csv
```

## Security Notes

1. **No SSH Keys**: Access is controlled via IAM policies, not SSH keys
2. **Private Subnet**: Bastion is in private subnet, not publicly accessible
3. **CloudTrail Logs**: All sessions are logged in CloudTrail
4. **Encrypted Volumes**: EBS volumes are encrypted at rest
5. **Automatic Credentials**: Database passwords fetched from Secrets Manager

## Troubleshooting

### "Session Manager plugin is not found"

Install the Session Manager plugin:

```bash
brew install --cask session-manager-plugin
```

### "TargetNotConnected" error

The instance might be stopped or SSM agent not ready:

```bash
# Check instance state
aws ec2 describe-instances --instance-ids i-xxx \
  --query 'Reservations[0].Instances[0].State.Name'

# If stopped, start it
aws ec2 start-instances --instance-ids i-xxx
```

### Can't connect to database

1. Check the database is running
2. Verify security group allows connections from bastion
3. Check database credentials in Secrets Manager

## Cost Savings

The bastion is a t3.micro instance. To save costs:

1. **Stop when not in use**: Instance hours only charged when running
2. **Automated stopping**: Consider adding a Lambda to stop it nightly
3. **Review usage**: Use CloudTrail to see when it was last accessed

```bash
# Stop the instance when done
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
```

## Future: dev_tool Integration

The `dev_tool` script will be updated to automate:

- Starting the bastion
- Connecting via SSM
- Running data extraction scripts
- Stopping the bastion when done

This matches the current workflow but uses SSM instead of SSH.
