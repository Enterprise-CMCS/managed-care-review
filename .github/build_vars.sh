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
  'OKTA_METADATA_URL'
  'IAM_PATH'
  'IAM_PERMISSIONS_BOUNDARY_POLICY'
  'STAGE_PREFIX'
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
  if [ "$varname" = "REACT_APP_AUTH_MODE" ]; then
    echo "BRANCH_SPECIFIC_VARNAME_$varname=${branch_name//-/_}_$varname"
  fi
  echo "BRANCH_SPECIFIC_VARNAME_$varname=${branch_name//-/_}_$varname" >> "$GITHUB_ENV"
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
