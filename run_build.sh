#! /bin/bash
echo stage name
cd services/app-web
echo $(pwd)
echo $REACT_APP_STAGE_NAME
if [ "$REACT_APP_STAGE_NAME" == "prod" ] || [ "$REACT_APP_STAGE_NAME" == "val" ];
    then
        echo "prod or val"
        yarn run build_prod
    else
        echo "instrumenting"
        yarn run build_instrumented
fi

