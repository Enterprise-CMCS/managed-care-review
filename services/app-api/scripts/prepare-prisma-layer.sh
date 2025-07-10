#!/bin/bash
function preparePrismaLayer() {
    echo pwd
    echo "Cleaning up workspace ..."
    rm -rf lambda-layers-prisma-client-migration
    rm -rf lambda-layers-prisma-client-engine

    echo "Creating migration layer ..."
    #mkdir -p lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma
    mkdir -p lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines
    mkdir -p lambda-layers-prisma-client-migration/nodejs/node_modules/prisma
    mkdir -p lambda-layers-prisma-client-migration/nodejs/prisma
    mkdir -p lambda-layers-prisma-client-migration/nodejs/dataMigrations
    mkdir -p lambda-layers-prisma-client-migration/nodejs/gen

    echo "Creating engine layer ..."
    #mkdir -p lambda-layers-prisma-client-engine/nodejs/node_modules/.prisma
    mkdir -p lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines
    mkdir -p lambda-layers-prisma-client-engine/nodejs/node_modules/prisma
    mkdir -p lambda-layers-prisma-client-engine/nodejs/prisma

    echo "Generate RHEL client..."
    PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x pnpm exec prisma generate

    echo "Prepare Prisma Client Migration lambda layer"
    rsync -av node_modules/@prisma/client/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/client
    rsync -av node_modules/prisma/ lambda-layers-prisma-client-migration/nodejs/node_modules/prisma
    # Find the current prisma client version path dynamically
    PRISMA_CLIENT_PATH=$(find ./../../node_modules/.pnpm -name "@prisma+client@*" -type d | head -1)
    if [ -n "$PRISMA_CLIENT_PATH" ]; then
        echo "Found Prisma client path: $PRISMA_CLIENT_PATH"
        rsync -av "$PRISMA_CLIENT_PATH/node_modules/.prisma/" lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma
    else
        echo "ERROR: Could not find Prisma client path in .pnpm"
        exit 1
    fi
    cp ./../../node_modules/.pnpm/node_modules/@prisma/engines/libquery_engine-rhel-openssl-3.0.x.so.node lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/
    cp ./../../node_modules/.pnpm/node_modules/@prisma/engines/schema-engine-rhel-openssl-3.0.x lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/
    cp ./../../node_modules/.pnpm/node_modules/@prisma/engines/package.json lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/package.json
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/engines/dist/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/dist
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/debug/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/debug
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/engines-version/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines-version
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/fetch-engine/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/fetch-engine
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/get-platform/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/get-platform

    echo "Prepare Prisma Client Engine lambda layer"
    rsync -av node_modules/@prisma/client/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/client
    rsync -av node_modules/prisma/ lambda-layers-prisma-client-engine/nodejs/node_modules/prisma
    # Use the same dynamically found path for the engine layer
    if [ -n "$PRISMA_CLIENT_PATH" ]; then
        echo "Using Prisma client path: $PRISMA_CLIENT_PATH"
        rsync -av "$PRISMA_CLIENT_PATH/node_modules/.prisma/" lambda-layers-prisma-client-engine/nodejs/node_modules/.prisma
    else
        echo "ERROR: Could not find Prisma client path in .pnpm"
        exit 1
    fi
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/engines/dist/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/dist
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/debug/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/debug
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/engines-version/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines-version
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/fetch-engine/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/fetch-engine
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/get-platform/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/get-platform

    echo "Copy schema migration files to layer..."
    rsync -av prisma/ lambda-layers-prisma-client-migration/nodejs/prisma
    rsync -av prisma/ lambda-layers-prisma-client-engine/nodejs/prisma

    echo "Copy proto migration files to layer..."
    rsync -av ../app-proto/gen/ lambda-layers-prisma-client-migration/nodejs/gen
    rsync -av node_modules/uuid/ lambda-layers-prisma-client-migration/nodejs/node_modules/uuid

    echo "Copy data migration files to layer..."
    rsync -av ../app-api/build/src/dataMigrations lambda-layers-prisma-client-migration/nodejs/dataMigrations

    echo "Remove Prisma CLI ..."
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/cli
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/cli

    echo "Remove non-RHEL bins to save space ..."
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/engines
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/introspection-engine-debian-openssl-1.1.x 
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/libquery_engine-debian-openssl-1.1.x.so.node 
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/migration-engine-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/prisma-fmt-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/libquery_engine-rhel-openssl-1.0.x.so.node

    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/engines
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/introspection-engine-debian-openssl-1.1.x 
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/libquery_engine-debian-openssl-1.1.x.so.node 
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/migration-engine-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/prisma-fmt-debian-openssl-1.1.x

    echo "Compressing and cleaning migration engine..."
    pushd lambda-layers-prisma-client-migration && tar -zcf /tmp/nodejs.tar.gz . && mv /tmp/nodejs.tar.gz ./nodejs.tar.gz
    rm -rf nodejs
    ls -lh nodejs.tar.gz
    popd || exit

    echo "Compressing and cleaning prisma engine..."
    pushd lambda-layers-prisma-client-engine && tar -zcf /tmp/nodejs.tar.gz . && mv /tmp/nodejs.tar.gz ./nodejs.tar.gz
    rm -rf nodejs
    ls -lh nodejs.tar.gz
    popd || exit
}
preparePrismaLayer
