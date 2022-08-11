#! /bin/bash
echo stage name
echo $REACT_APP_STAGE_NAME
if [[ $REACT_APP_STAGE_NAME == "prod" || $REACT_APP_STAGE_NAME == "val" ]]; 
    then
        react-scripts build
    else
        CYPRESS_INSTRUMENT_PRODUCTION=true react-scripts -r @cypress/instrument-cra build
fi

