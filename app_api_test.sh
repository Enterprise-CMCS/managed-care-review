#! /bin/bash
cd services/app-api
echo $(pwd)
yarn test --coverage --watchAll=false
