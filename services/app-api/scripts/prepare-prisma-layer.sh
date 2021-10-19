#!/bin/bash
function preparePrismaLayer() {
    echo pwd
    echo "Cleaning up workspace ..."
    rm -rf lambda-layers-prisma-client

    echo "Creating layer ..."
    mkdir -p lambda-layers-prisma-client/nodejs/node_modules/.prisma
    mkdir -p lambda-layers-prisma-client/nodejs/node_modules/@prisma/engines
    mkdir -p lambda-layers-prisma-client/nodejs/node_modules/prisma
    mkdir -p lambda-layers-prisma-client/nodejs/prisma

    echo "Generate RHEL client..."
    PRISMA_CLI_BINARY_TARGETS=rhel-openssl-1.0.x yarn prisma generate

    echo "Prepare Prisma Client lambda layer ..."
    rsync -av node_modules/@prisma/client/ lambda-layers-prisma-client/nodejs/node_modules/@prisma/client
    rsync -av node_modules/prisma/ lambda-layers-prisma-client/nodejs/node_modules/prisma
    rsync -av node_modules/.prisma/ lambda-layers-prisma-client/nodejs/node_modules/.prisma
    cp node_modules/@prisma/engines/migration-engine-rhel-openssl-1.0.x lambda-layers-prisma-client/nodejs/node_modules/@prisma/engines/
    cp node_modules/@prisma/engines/libquery_engine-rhel-openssl-1.0.x.so.node lambda-layers-prisma-client/nodejs/node_modules/@prisma/engines/
    cp node_modules/@prisma/engines/package.json lambda-layers-prisma-client/nodejs/node_modules/@prisma/engines/package.json
    rsync -av node_modules/@prisma/engines/dist/ lambda-layers-prisma-client/nodejs/node_modules/@prisma/engines/dist

    echo "Copy migration files to layer..."
    rsync -av prisma/ lambda-layers-prisma-client/nodejs/prisma

    echo "Remove Prisma CLI ..."
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/@prisma/cli

    echo "Remove non-RHEL bins to save space ..."
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/prisma/engines
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/@prisma/introspection-engine-debian-openssl-1.1.x 
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/@prisma/libquery_engine-debian-openssl-1.1.x.so.node 
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/@prisma/migration-engine-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client/nodejs/node_modules/@prisma/prisma-fmt-debian-openssl-1.1.x

    echo "Compressing ..."
    pushd lambda-layers-prisma-client && tar -zcf /tmp/nodejs.tar.gz . && mv /tmp/nodejs.tar.gz ./nodejs.tar.gz

    echo "Remove unzipped files ..."
    rm -rf nodejs

    echo "Stats:"
    ls -lh nodejs.tar.gz

    popd || exit
}
preparePrismaLayer