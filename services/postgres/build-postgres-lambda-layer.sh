#!/bin/bash
function preparePostgresToolsLayer() {
    echo "Cleaning up workspace ..."
    rm -rf lambda-layer-postgres-tools

    echo "Creating postgres tools layer directory ..."
    mkdir -p lambda-layer-postgres-tools/bin
    mkdir -p lambda-layer-postgres-tools/lib
    
    echo "Installing PostgreSQL client tools ..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client
    
    # Copy binaries to the layer
    cp "$(which pg_dump)" lambda-layer-postgres-tools/bin/
    cp "$(which pg_restore)" lambda-layer-postgres-tools/bin/
    cp "$(which psql)" lambda-layer-postgres-tools/bin/
    cp "$(which pg_basebackup)" lambda-layer-postgres-tools/bin/ 2>/dev/null || true
    
    # Make sure binaries are executable
    chmod +x lambda-layer-postgres-tools/bin/*
    
    # Find and copy required shared libraries
    echo "Copying required shared libraries..."
    for binary in pg_dump pg_restore psql pg_basebackup; do
        if [ -f "$(which $binary)" ]; then
            # Get list of required shared libraries
            ldd "$(which $binary)" | grep "=> /" | awk '{print $3}' | while read -r lib; do
                # Copy library if it exists and isn't already copied
                if [ -f "$lib" ] && [ ! -f "lambda-layer-postgres-tools/lib/$(basename $lib)" ]; then
                    cp "$lib" lambda-layer-postgres-tools/lib/
                fi
            done
        fi
    done
    
    # Create a wrapper script for each binary that sets the library path
    for binary in lambda-layer-postgres-tools/bin/*; do
        if [ -f "$binary" ]; then
            mv "$binary" "${binary}.original"
            cat > "$binary" << EOF
#!/bin/bash
export LD_LIBRARY_PATH=/opt/lib:\$LD_LIBRARY_PATH
/opt/bin/$(basename "$binary").original "\$@"
EOF
            chmod +x "$binary"
        fi
    done
    
    # Check if binaries were copied
    echo "Copied binaries:"
    ls -l lambda-layer-postgres-tools/bin/
    echo "Copied libraries:"
    ls -l lambda-layer-postgres-tools/lib/
    
    echo "Compressing postgres tools layer..."
    pushd lambda-layer-postgres-tools && tar -zcf /tmp/postgres-tools.tar.gz . && mv /tmp/postgres-tools.tar.gz ./postgres-tools.tar.gz
    ls -lh postgres-tools.tar.gz
    popd || exit
}
preparePostgresToolsLayer