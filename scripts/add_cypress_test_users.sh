#!/bin/bash

# This script attempts to create two users in the given stage with a password set in $TEST_USERS_PASS
# These users are created directly in cognito, useful for AWS_COGNITO style login. 
# It should _NEVER_ be run in production where users are managed by IDM.

set -e

stage=${1:-dev}

# Test users are only available in DEV environments.
test_user_password=$TEST_USERS_PASS

test_users_exclude_stages=(
  'main'
  'val'
  'prod'
)

for excluded_stage in "${test_users_exclude_stages[@]}"
do
    if [ "$stage" == "$excluded_stage" ]
    then
       echo "INFO: Will not set test cognito users in this branch."
       exit 1
    fi
done

# Add test users as necessary
# Lets first get the emails of developers that have committed to the repo, so we can add the emails as test users.
# This will also result in adding any new developers in the branch (cumulative).
echo "INFO: Creating test users .."
cognito_user_pool_id=$(services/output.sh services/ui-auth UserPoolId "$stage")

if [ -n "$cognito_user_pool_id" ]
then
    
        # We ignore all the errors if the user exists.
        echo "add user aang"
        set +e
        aws cognito-idp admin-create-user --user-pool-id "$cognito_user_pool_id" --message-action SUPPRESS --username aang@dhs.state.mn.us \
        --user-attributes Name=given_name,Value=TestFirstName Name=family_name,Value=TestLastName Name=email,Value=aang@dhs.state.mn.us Name=custom:state_code,Value=MN
        set -e
        echo "set password aang"
        aws cognito-idp admin-set-user-password --user-pool-id "$cognito_user_pool_id" --username aang@dhs.state.mn.us --password "$test_user_password" --permanent

        echo "add user toph"
        set +e
        aws cognito-idp admin-create-user --user-pool-id "$cognito_user_pool_id" --message-action SUPPRESS --username toph@dmas.virginia.gov \
        --user-attributes Name=given_name,Value=TestFirstName Name=family_name,Value=TestLastName Name=email,Value=toph@dmas.virginia.gov Name=custom:state_code,Value=VA
        set -e
        echo "set password toph"
        aws cognito-idp admin-set-user-password --user-pool-id "$cognito_user_pool_id" --username toph@dmas.virginia.gov --password "$test_user_password" --permanent
else
    echo "ERROR: There was an error obtaining AWS resource information to create users or the command was called with the incorrect stage."
    exit 1
fi
