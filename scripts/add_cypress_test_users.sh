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

add_test_user () {
    name=$1
    email=$2
    role=$3
    state=$4

    role_attr="Name=custom:role,Value=$role"

    state_attr=""
    if [ "$role" = "STATE_USER" ]; then
        state_attr="Name=custom:state_code,Value=$state"
    fi

    echo "add user $name"
    set +e
    aws cognito-idp admin-create-user --user-pool-id "$cognito_user_pool_id" --message-action SUPPRESS --username "$email" \
    --user-attributes "Name=given_name,Value=$name" Name=family_name,Value=TestLastName "Name=email,Value=$email" "$role_attr" "$state_attr"
    set -e
    echo "set password $name"
    aws cognito-idp admin-set-user-password --user-pool-id "$cognito_user_pool_id" --username "$email" --password "$test_user_password" --permanent
}


if [ -n "$cognito_user_pool_id" ]
then
        # We ignore all the errors if the user exists.
        add_test_user Aang aang@dhs.state.mn.us STATE_USER MN
        add_test_user Toph toph@dmas.virginia.gov STATE_USER VA
        add_test_user Zuko zuko@dmas.virginia.gov CMS_USER
else
    echo "ERROR: There was an error obtaining AWS resource information to create users or the command was called with the incorrect stage."
    exit 1
fi
