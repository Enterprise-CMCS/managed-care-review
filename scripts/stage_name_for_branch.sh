#!/bin/bash

# AWS has several hard limits for resource names. We generate many of our resource names based on the stage name for a given deployment. We generate the stage name based on the current branch name to keep different review apps from colliding.
# This script takes a branch name passed in as $1 and prints out a stage name that should be valid. That then can be passed to the deploy and destroy scripts safely.

# Based on [this writeup](https://stackoverflow.com/questions/46052869/what-are-the-most-restrictive-aws-resource-name-limitations-e-g-characters-and), the rules we are going to enforce are as follows:

# Additionaly, AWS Aurora does not allow for _ or - in database names

# 1. Only lowercase alphanumeric characters
# 2. Minimum of 3 characters and maximum of 23
# 3. First character must be a letter, cannot end with a hyphen or contain two consecutive hyphens

# Rule 2 is a little more constricted than the docs above indicate. Since we generate a bunch of resource names based on the stage prefix, the max overall length is 63 characters, so our actual stage minimum is going to be 30 chars. Any longer and we will truncate.

# We originally picked 30 based on these two errors:
# this was a lambda name I think
# stream-functions-jf-items-amended-definitions-help-emailSubmitter <= 64
# 33 branch -> 65 resource
# this was a userpooldomain
# jf-contract-rate-details-reorder-login-5ct1nomca6uri0lab4dif4a702  <= 63
# 32 branch -> 65 resource

# We had to turn that down to 23 because the quickstart team's IAM plugin adds a role to stream-functions that creates:
# stream-functions-dependabotnpmandyarntypea717e-us-east-1-lambdaRole == 67

# *If you make changes to this script* please run the test file by running ./stage_name_for_branch_test.js

branch_name="$1"

>&2 echo "converting $branch_name"

if [ -z "$branch_name" ]; then
    echo "Must pass a branch name as an argument"
    exit 1
fi

# delete _, - and /
branch_name=${branch_name//[_\/\-]/}

>&2 echo "translate $branch_name"

# get rid of special characters
branch_name=${branch_name//[^a-zA-Z0-9-]/}

>&2 echo "rid $branch_name"

# remove doubled dashes
# shellcheck disable=SC2001
branch_name=$(echo "$branch_name" | sed "s/---*/-/g")

>&2 echo "dash $branch_name"

# remove aws string from branch name
branch_name=${branch_name//aws/}

>&2 echo "aws $branch_name"

# downcase everything
branch_name=$(echo "$branch_name" | awk '{print tolower($0)}')

>&2 echo "down $branch_name"

# If it's too long, chop off the end and replace it with a hash of the whole thing
if [ ${#branch_name} -gt 23 ]; then

    # macOS and Linux use different programs to calculate hashes
    shabin=sha1sum
    if [ "$(uname -s)" = "Darwin" ]; then
        shabin=shasum
    fi

    branch_hash=$(echo -n "$branch_name" | "$shabin")

    >&2 echo "hash $branch_hash"

    branch_name="${branch_name:0:18}${branch_hash:0:5}"

    >&2 echo "combined $branch_name"

    # remove doubled dashes, again
    # shellcheck disable=SC2001
    branch_name=$(echo "$branch_name" | sed "s/---*/-/g")
fi

# the one thing we're not going to try and fix is if you start with a number or -
if [[ "$branch_name" = [0-9-]* ]]; then
    echo "can't start with a number"
    exit 1
fi

>&2 echo "returning $branch_name"

echo "$branch_name"
