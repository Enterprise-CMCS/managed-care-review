#! /bin/bash
printenv
CYPRESS_INSTRUMENT_PRODUCTION=true react-scripts -r @cypress/instrument-cra build
