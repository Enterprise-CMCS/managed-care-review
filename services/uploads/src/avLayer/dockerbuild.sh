#!/usr/bin/env bash

set -e
docker pull amazonlinux:2
docker run --rm -v `pwd`/build:/opt/app amazonlinux:2 /bin/bash -c "cd /opt/app && ./build.sh"