#! /bin/bash
$1 = REACT_APP_STAGE_NAME
echo stage name
echo $1

if [[ $1 == "prod" || $1 == "val" ]]; 
    then
        react-scripts build
    else
        CYPRESS_INSTRUMENT_PRODUCTION=true react-scripts -r @cypress/instrument-cra build
fi
