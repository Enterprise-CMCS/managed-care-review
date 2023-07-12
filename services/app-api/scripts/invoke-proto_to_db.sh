#!/usr/bin/env bash
set -u

function_name="$1"
lambda_version="${2:-\$LATEST}"

cli_read_timeout=240

if (set -x ; aws lambda invoke --qualifier "$lambda_version" --cli-read-timeout "$cli_read_timeout" --function "$function_name" lambda_response.json) ; then
  packageIDExists="$(jq '.pkgID' < lambda_response.json)"
  if [[ "$packageIDExists" == null ]] ; then
    cat lambda_response.json
    echo "Lambda function did not complete successfully." 1>&2
    exit 1
  else
    echo "Lambda function executed successfully, package ID: $packageIDExists"
  fi
else
  exit
fi
