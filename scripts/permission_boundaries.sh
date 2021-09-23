#!/bin/bash

# this script pulls down the permission boundary ARN for a given environment. 

set -e

: "${1?ERROR: "You must pass the target user's username as the one and only arugment to this script."}"

# Get the username of the user in question
username=${1}

# Find the permissions boundary attached to that user.  Store its arn
permissionsBoundaryArn=$(aws iam get-user --user-name "$username" | jq -r '.User.PermissionsBoundary.PermissionsBoundaryArn')

# Get the current policy version.  We will need it to get the statements in the policy
policyVersionId=$(aws iam get-policy --policy-arn "$permissionsBoundaryArn" | jq -r '.Policy.DefaultVersionId')

# Now we get all of the policy's statements
policyStatements=$(aws iam get-policy-version --policy-arn "$permissionsBoundaryArn" --version-id "$policyVersionId")

# Filter the statements to find the path all role's must be made under.
path=$(echo "$policyStatements" | jq -r '.PolicyVersion.Document.Statement | .[] | select(.Sid=="NoRolesOutsidePath").NotResource[0]')
permissionsBoundaryThatMustBeAttached=$(echo "$policyStatements" | jq -r '.PolicyVersion.Document.Statement | .[] | select(.Sid=="RequirePermBound").Condition.StringNotEquals."iam:PermissionsBoundary"')

cat << EOF
********************************************************************************
Here's the info we found on $username

All roles the user creates must be under this path:  $path
All roles the user creates must have this perm boundary attached:  $permissionsBoundaryThatMustBeAttached
********************************************************************************
EOF
