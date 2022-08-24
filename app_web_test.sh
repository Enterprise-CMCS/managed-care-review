#! /bin/bash
cd services/app-web
echo $(pwd)
yarn test --coverage --watchAll=false
