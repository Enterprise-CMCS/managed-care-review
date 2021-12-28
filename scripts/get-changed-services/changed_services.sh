#!/bin/bash
set -e

triggered_commit="$1"

previous_commit=$(git rev-parse --verify --short "$triggered_commit"^)
changed_services="$(lerna ls --since "$previous_commit" -all --json | jq -c '[.[] | .name]')"

printf "%s" "$changed_services"