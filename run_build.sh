#! /bin/bash
echo stage name
echo "$VITE_APP_STAGE_NAME"
if [ "$VITE_APP_STAGE_NAME" == "prod" ] || [ "$VITE_APP_STAGE_NAME" == "val" ];
    then
        echo "building for prod or val without instrumentation"
        cd services/app-web && pnpm build:prod
    else
        echo "instrumenting for cypress"
        cd services/app-web && pnpm build:instrumented
fi

