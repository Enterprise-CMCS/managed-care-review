#!/bin/bash

var_list=(
  'REACT_APP_AUTH_MODE'
  'AWS_ACCESS_KEY_ID'
  'AWS_SECRET_ACCESS_KEY'
  'AWS_DEFAULT_REGION'
  'INFRASTRUCTURE_TYPE'
  'SES_SOURCE_EMAIL_ADDRESS'
  'SES_REVIEW_TEAM_EMAIL_ADDRESS'
  'ROUTE_53_HOSTED_ZONE_ID'
  'ROUTE_53_DOMAIN_NAME'
  'CLOUDFRONT_CERTIFICATE_ARN'
  'CLOUDFRONT_DOMAIN_NAME'
  'CLOUDFRONT_STORYBOOK_DOMAIN_NAME'
  'OKTA_METADATA_URL'
  'IAM_PATH'
  'FULL_IAM_PERMISSIONS_BOUNDARY_POLICY'
  'STAGE_PREFIX'
  'DATABASE_URL'
  'TEST_USERS_PASS'
)

set_value() {
  varname=${1}
  if [ -n "${!varname}" ]; then
    echo "Setting $varname"
    echo "${varname}=${!varname}" >> "$GITHUB_ENV"
  fi
}

set_name() {
  varname=${1}
  branch=${branch_name:?}

  echo "BRANCH_SPECIFIC_VARNAME_$varname=${branch//-/_}_$varname" >> "$GITHUB_ENV"
}

case "$1" in
set_names)
  for i in "${var_list[@]}"
  do
    set_name "$i"
  done
  ;;
set_values)
  for i in "${var_list[@]}"
  do
  	set_value "$i"
  done
  ;;
esac
