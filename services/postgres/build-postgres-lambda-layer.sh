#!/bin/bash
# Script to build PostgreSQL tools Lambda layer using Docker
echo "Building PostgreSQL Lambda layer..."
# Ensure we have a clean workspace
rm -rf lambda-layer-postgres-tools
mkdir -p lambda-layer-postgres-tools

# Create the proper Lambda layer structure
mkdir -p lambda-layer-postgres-tools/bin
mkdir -p lambda-layer-postgres-tools/lib

# Run build in Amazon Linux 2 container
docker run --rm \
  -v "$(pwd)/lambda-layer-postgres-tools:/output" \
  amazonlinux:2 bash -c '
    # Install prerequisites
    yum install -y wget

    # Add PostgreSQL official repository
    wget https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    yum install -y pgdg-redhat-repo-latest.noarch.rpm
    
    # Install PostgreSQL 14 client only
    yum install -y postgresql14
    
    # Find PostgreSQL binaries location
    PG_BIN_DIR="/usr/pgsql-14/bin"
    
    # Copy PostgreSQL binaries directly to bin directory (not using .original suffix)
    cp "$PG_BIN_DIR/pg_dump" /output/bin/pg_dump
    cp "$PG_BIN_DIR/pg_restore" /output/bin/pg_restore
    cp "$PG_BIN_DIR/psql" /output/bin/psql
    
    # Make binaries executable
    chmod 755 /output/bin/*
    
    # Copy all needed libraries
    for bin in pg_dump pg_restore psql; do
      ldd "$PG_BIN_DIR/$bin" | grep "=> /" | awk "{print \$3}" | sort | uniq | while read -r lib; do
        if [ -f "$lib" ]; then
          cp "$lib" "/output/lib/$(basename $lib)"
          chmod 755 "/output/lib/$(basename $lib)"
        fi
      done
    done
    
    # Copy PostgreSQL specific libraries
    for lib in /usr/pgsql-14/lib/*.so*; do
      if [ -f "$lib" ]; then
        cp "$lib" "/output/lib/$(basename $lib)"
        chmod 755 "/output/lib/$(basename $lib)"
      fi
    done
    
    # Create a bootstrap script that will be referenced in the Lambda function
    echo "#!/bin/bash" > "/output/bootstrap.sh"
    echo "export LD_LIBRARY_PATH=/opt/lib:\$LD_LIBRARY_PATH" >> "/output/bootstrap.sh"
    echo "# This script can be sourced in your Lambda function" >> "/output/bootstrap.sh"
    chmod 755 "/output/bootstrap.sh"
  '

# Create the final layer archive
cd lambda-layer-postgres-tools || exit
zip -r ../postgres-tools-layer.zip .
cd ..
echo "Done! Lambda layer created: postgres-tools-layer.zip"
ls -lh postgres-tools-layer.zip