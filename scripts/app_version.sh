#!/bin/bash

set -e

version=$(git rev-parse --verify --short HEAD)
suffix=""

# Check that there are no changes in this directory by checking 
# that the output of git status is empty
status_output=$(git status --porcelain)
if  [ -n "$status_output" ]; then
	suffix="-dirty"
fi

echo "$version$suffix"
