#! /bin/bash
echo stage name
echo $(REACT_APP_STAGE_NAME)
echo $(STAGE_NAME)
CYPRESS_INSTRUMENT_PRODUCTION=true react-scripts -r @cypress/instrument-cra build
