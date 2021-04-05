#!/bin/bash

set -e

stage=${1:-dev}

# services=(
#   'database'
#   'uploads'
#   # 'uploads-scan'
#   'app-api'
#   'stream-functions'
#   'ui'
#   'ui-auth'
#   'storybook'
#   'app-web'
# )
# These test users are only available in DEV environments.
TEST_USERS=(
  'aang.hhs.local'
  'toph@cms.hhs.local'
)

TEST_USER_PASSWORD="Passw0rd!"

# What stages shall NOT have the test users.
test_users_exclude_stages=(
  'master'
  'production'
)

# install_deps() {
#   if [ "$CI" == "true" ]; then # If we're in a CI system
#     if [ ! -d "node_modules" ]; then # If we don't have any node_modules (CircleCI cache miss scenario), run yarn install --frozen-lockfile.  Otherwise, we're all set, do nothing.
#       yarn install --frozen-lockfile
#     fi
#   else # We're not in a CI system, let's yarn install
#     yarn install
#   fi
# }

# deploy() {
#   service=$1
#   pushd services/$service
#   install_deps
#   serverless deploy  --stage $stage
#   popd
# }

# install_deps
# export PATH=$(pwd)/node_modules/.bin/:$PATH

# Identify if we need the test users.
# Note that we use ALLOW_DEV_LOGIN in ui-src as well to show Dev only login buttons.
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
# for i in "${services[@]}"
# do
# 	deploy $i
# done

# pushd services

# Add test users as necessary
if [ $ALLOW_DEV_LOGIN == true ]
then
  # Lets first get the emails of developers that have committed to the repo, so we can add the emails as test users.
  # This will also result in adding any new developers in the branch (cumulative).
  dev_emails=`git log --pretty=format:'%ae' | grep -v github.com | sort -u`
  TEST_USERS+=("${dev_emails[@]}")
  echo "INFO: Creating the following test users as needed..."
  echo "${TEST_USERS[@]}"
  cognito_user_pool_id=`./services/output.sh services/ui-auth UserPoolId $stage`
  if [ ! -z "$cognito_user_pool_id" ]
  then
      for user in "${TEST_USERS[@]}"
      do
          # We ignore all the errors if the user exists.
          set +e
          aws cognito-idp admin-create-user --user-pool-id $cognito_user_pool_id --message-action SUPPRESS --username $user \
          --user-attributes Name=given_name,Value=TestFirstName Name=family_name,Value=TestLastName,Name=email,Value=mc-review-test@cms.hhs.local,Name=custom:state_code,Value=MN
          aws cognito-idp admin-set-user-password --user-pool-id $cognito_user_pool_id --username $user --password $TEST_USER_PASSWORD --permanent
          set -e
      done
  else
      echo "ERROR: There was an error obtaining AWS resource information to create users."
      exit 1
  fi
fi

echo """
------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------
Application endpoint:  `./output.sh ui CloudFrontEndpointUrl $stage`
Storybook endpoint:  `./output.sh storybook CloudFrontEndpointUrl $stage`

SSO URL: `./output.sh ui-auth UserPoolSingleSignOnURL $stage`
AudienceRestriction: `./output.sh ui-auth AudienceRestrictionURI $stage`
------------------------------------------------------------------------------------------------
"""
# popd
