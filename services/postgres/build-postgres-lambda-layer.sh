#!/bin/bash

function preparePostgresToolsLayer() {
    echo "Cleaning up workspace ..."
    rm -rf lambda-layer-postgres-tools

    echo "Creating postgres tools layer directory ..."
    mkdir -p lambda-layer-postgres-tools/bin

    echo "Installing PostgreSQL client tools ..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client

    # Copy binaries to the layer
    cp "$(which pg_dump)" lambda-layer-postgres-tools/bin/
    cp "$(which pg_restore)" lambda-layer-postgres-tools/bin/
    cp "$(which psql)" lambda-layer-postgres-tools/bin/
    cp "$(which pg_basebackup)" lambda-layer-postgres-tools/bin/ 2>/dev/null || true

    # Check if binaries were copied
    echo "Copied binaries:"
    ls -l lambda-layer-postgres-tools/bin/

    echo "Compressing postgres tools layer..."
    pushd lambda-layer-postgres-tools && tar -zcf /tmp/bin.tar.gz . && mv /tmp/bin.tar.gz ./bin.tar.gz
    rm -rf bin
    ls -lh bin.tar.gz
    popd || exit
}

preparePostgresToolsLayer