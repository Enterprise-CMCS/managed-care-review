#!/bin/bash
set -e

triggered_commit="$1"

printf "GitHub Action triggered by commit: %s" "${triggered_commit}"

previous_commit=$(git rev-parse --verify --short "$triggered_commit"^)
changed_services="$(lerna ls --since "$previous_commit" -all --json | jq '[.[] | .name]')"

echo "$changed_services"