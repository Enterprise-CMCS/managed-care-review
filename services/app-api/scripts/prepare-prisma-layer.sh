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
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/config/ lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/config

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
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/engines/dist/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines/dist
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/debug/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/debug
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/engines-version/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines-version
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/fetch-engine/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/fetch-engine
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/get-platform/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/get-platform
    rsync -av ./../../node_modules/.pnpm/node_modules/@prisma/config/ lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/config

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
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/migration-engine*
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/introspection-engine*
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/@prisma/engines/prisma-fmt*

    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/engines
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/introspection-engine-debian-openssl-1.1.x 
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/libquery_engine-debian-openssl-1.1.x.so.node 
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/migration-engine-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/prisma-fmt-debian-openssl-1.1.x
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/debug
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines-version
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/fetch-engine
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/get-platform
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines/migration-engine*
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines/introspection-engine*
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/engines/prisma-fmt*

    echo "Remove unused database WASM files and Prisma Studio assets (keep only PostgreSQL)..."
    
    # Remove WASM files for unused databases in runtime directory (saves ~59MB)
    find lambda-layers-prisma-client-migration/nodejs -name "*cockroach*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs -name "*mysql*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs -name "*sqlite*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs -name "*sqlserver*wasm*" -delete 2>/dev/null || true
    
    find lambda-layers-prisma-client-engine/nodejs -name "*cockroach*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs -name "*mysql*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs -name "*sqlite*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs -name "*sqlserver*wasm*" -delete 2>/dev/null || true
    
    # Remove additional WASM files for unused databases in build directory
    find lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/build -name "*cockroach*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/build -name "*mysql*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/build -name "*sqlite*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/build -name "*sqlserver*wasm*" -delete 2>/dev/null || true
    
    find lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/build -name "*cockroach*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/build -name "*mysql*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/build -name "*sqlite*wasm*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/build -name "*sqlserver*wasm*" -delete 2>/dev/null || true
    
    # Remove Prisma Studio web UI assets
    rm -rf lambda-layers-prisma-client-migration/nodejs/node_modules/prisma/build/public/ 2>/dev/null || true
    rm -rf lambda-layers-prisma-client-engine/nodejs/node_modules/prisma/build/public/ 2>/dev/null || true

    echo "Remove development files and documentation..."

    # Remove TypeScript definitions (not needed at runtime)
    find lambda-layers-prisma-client-migration/nodejs -name "*.d.ts" -delete
    find lambda-layers-prisma-client-engine/nodejs -name "*.d.ts" -delete

    # Remove source maps
    find lambda-layers-prisma-client-migration/nodejs -name "*.map" -delete
    find lambda-layers-prisma-client-engine/nodejs -name "*.map" -delete

    # Remove common dev/doc files
    find lambda-layers-prisma-client-migration/nodejs -name "*.md" -delete
    find lambda-layers-prisma-client-migration/nodejs -name "*.txt" -delete
    find lambda-layers-prisma-client-migration/nodejs -name "CHANGELOG*" -delete
    find lambda-layers-prisma-client-migration/nodejs -name "LICENSE*" -delete
    find lambda-layers-prisma-client-migration/nodejs -name ".npmignore" -delete
    find lambda-layers-prisma-client-migration/nodejs -name "package-lock.json" -delete

    find lambda-layers-prisma-client-engine/nodejs -name "*.md" -delete
    find lambda-layers-prisma-client-engine/nodejs -name "*.txt" -delete
    find lambda-layers-prisma-client-engine/nodejs -name "CHANGELOG*" -delete
    find lambda-layers-prisma-client-engine/nodejs -name "LICENSE*" -delete
    find lambda-layers-prisma-client-engine/nodejs -name ".npmignore" -delete
    find lambda-layers-prisma-client-engine/nodejs -name "package-lock.json" -delete

    find lambda-layers-prisma-client-migration/nodejs -name "*windows*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs -name "*darwin*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-migration/nodejs -name "*.exe" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs -name "*windows*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs -name "*darwin*" -delete 2>/dev/null || true
    find lambda-layers-prisma-client-engine/nodejs -name "*.exe" -delete 2>/dev/null || true

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

    echo "=== TOTAL COMPRESSED SIZES ==="
    ls -lh lambda-layers-prisma-client-*/nodejs.tar.gz
    echo "Combined uncompressed size would be approximately:"
    total_size=$(du -sb lambda-layers-prisma-client-*/nodejs.tar.gz | awk '{sum += $1} END {print sum}')
    echo "Scale=2; $total_size / 1024 / 1024" | bc -l | xargs printf "%.2f MB\n"
}
preparePrismaLayer
