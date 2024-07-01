#! /bin/bash
echo stage name
echo "$VITE_APP_STAGE_NAME"
if [ "$VITE_APP_STAGE_NAME" == "prod" ] || [ "$VITE_APP_STAGE_NAME" == "val" ];
    then
        echo "building for prod or val without instrumentation"
        npx lerna run build:prod --scope=app-web
    else
        echo "instrumenting for cypress"
        npx lerna run build:instrumented --scope=app-web
fi

