#!/bin/bash
function preparePrismaLayer() {
    echo pwd
    echo "Cleaning up workspace ..."
    rm -rf lambda-layers-prisma-client-query
    rm -rf lambda-layers-prisma-client-migration

    echo "Creating query layer ..."
    mkdir -p lambda-layers-prisma-client-query/nodejs/node_modules/.prisma
    mkdir -p lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/engines
    mkdir -p lambda-layers-prisma-client-query/nodejs/node_modules/prisma
    mkdir -p lambda-layers-prisma-client-query/nodejs/prisma

    echo "Creating migration layer ..."
    mkdir -p lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma
    mkdir -p lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines
    mkdir -p lambda-layers-prisma-client-migration/nodejs/node_modules/prisma
    mkdir -p lambda-layers-prisma-client-migration/nodejs/prisma

    echo "Generate RHEL client..."
    PRISMA_CLI_BINARY_TARGETS=rhel-openssl-1.0.x yarn prisma generate

    echo "Prepare Prisma Client Query Engine lambda layer ..."
    rsync -av ../../node_modules/@prisma/client/ lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/client
    rsync -av ../../node_modules/prisma/ lambda-layers-prisma-client-query/nodejs/node_modules/prisma
    rsync -av ../../node_modules/.prisma/ lambda-layers-prisma-client-query/nodejs/node_modules/.prisma
    cp ../../node_modules/@prisma/engines/libquery_engine-rhel-openssl-1.0.x.so.node lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/engines/
    cp ../../node_modules/@prisma/engines/package.json lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/engines/package.json
    rsync -av ../../node_modules/@prisma/engines/dist/ lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/engines/dist

    echo "Prepare Prisma Client Migration lambda layer"
    rsync -av ../../node_modules/@prisma/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma
    rsync -av ../../node_modules/prisma/ lambda-layers-prisma-client-migration/nodejs/node_modules/prisma
    rsync -av ../../node_modules/.prisma/ lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma

    echo "Copy migration files to layer..."
    rsync -av prisma/ lambda-layers-prisma-client-migration/nodejs/prisma

    echo "Remove Prisma CLI ..."
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/cli
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/cli

    echo "Remove non-RHEL bins to save space ..."
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node 
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/prisma/engines
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/introspection-engine-debian-openssl-1.1.x 
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/libquery_engine-debian-openssl-1.1.x.so.node 
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/migration-engine-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-query/nodejs/node_modules/@prisma/prisma-fmt-debian-openssl-1.1.x

    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node 
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/engines
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/introspection-engine-debian-openssl-1.1.x 
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/libquery_engine-debian-openssl-1.1.x.so.node 
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/migration-engine-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/prisma-fmt-debian-openssl-1.1.x

    echo "Compressing and cleaning query engine..."
    pushd lambda-layers-prisma-client-query && tar -zcf /tmp/nodejs.tar.gz . && mv /tmp/nodejs.tar.gz ./nodejs.tar.gz
    rm -rf nodejs
    ls -lh nodejs.tar.gz
    popd || exit

    echo "Compressing and cleaning migration engine..."
    pushd lambda-layers-prisma-client-migration && tar -zcf /tmp/nodejs.tar.gz . && mv /tmp/nodejs.tar.gz ./nodejs.tar.gz
    rm -rf nodejs
    ls -lh nodejs.tar.gz
    popd || exit
}
preparePrismaLayer