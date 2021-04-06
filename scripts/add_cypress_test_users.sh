#!/bin/bash
set -e

stage=${1:-dev}

# Test users are only available in DEV environments.
TEST_USER_PASSWORD="Passw0rd!"

test_users_exclude_stages=(
  'main'
  'val'
  'prod'
)

export ALLOW_DEV_LOGIN=true
for excluded_stage in "${test_users_exclude_stages[@]}"
do
    if [ $stage == $excluded_stage ]
    then
       export ALLOW_DEV_LOGIN=false
       echo "INFO: Will not set test users in this branch."
       break
    fi
done

# Add test users as necessary
if [ $ALLOW_DEV_LOGIN == true ]
then
  # Lets first get the emails of developers that have committed to the repo, so we can add the emails as test users.
  # This will also result in adding any new developers in the branch (cumulative).
  echo "INFO: Creating test users .."
  cognito_user_pool_id=`services/output.sh services/ui-auth UserPoolId $stage`

  if [ ! -z "$cognito_user_pool_id" ]
  then
      
          # We ignore all the errors if the user exists.
          echo "add user aang"
          set +e
          aws cognito-idp admin-create-user --user-pool-id $cognito_user_pool_id --message-action SUPPRESS --username aang@dhs.state.mn.us \
          --user-attributes Name=given_name,Value=TestFirstName Name=family_name,Value=TestLastName Name=email,Value=aang@dhs.state.mn.us Name=custom:state_code,Value=MN
          aws cognito-idp admin-set-user-password --user-pool-id $cognito_user_pool_id --username aang@dhs.state.mn.us --password $TEST_USER_PASSWORD --permanent
          set -e

          echo "add user toph"
          set +e
          aws cognito-idp admin-create-user --user-pool-id $cognito_user_pool_id --message-action SUPPRESS --username toph@dmas.virginia.gov \
          --user-attributes Name=given_name,Value=TestFirstName Name=family_name,Value=TestLastName Name=email,Value=toph@dmas.virginia.gov Name=custom:state_code,Value=VA
          aws cognito-idp admin-set-user-password --user-pool-id $cognito_user_pool_id --username toph@dmas.virginia.gov --password $TEST_USER_PASSWORD --permanent
          set -e
  else
      echo "ERROR: There was an error obtaining AWS resource information to create users or the command was called with the incorrect stage."
      exit 1
  fi
fi
