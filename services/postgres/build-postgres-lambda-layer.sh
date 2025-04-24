#!/bin/bash
# Clean workspace
rm -rf lambda-layer-postgres-tools
mkdir -p lambda-layer-postgres-tools

# Run build in Amazon Linux 2 container
docker run --rm \
  -v "$(pwd)/lambda-layer-postgres-tools:/output" \
  amazonlinux:2 bash -c '
    # Install prerequisites
    yum update -y
    yum install -y yum-utils which findutils tar gzip wget

    # Add PostgreSQL official repository
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    
    # Install PostgreSQL 14 client
    yum install -y postgresql14

    # Create layer directories
    mkdir -p /output/bin /output/lib

    # PostgreSQL binaries directory
    PG_BIN_DIR="/usr/pgsql-14/bin"
    PG_LIB_DIR="/usr/pgsql-14/lib"

    # Copy PostgreSQL binaries directly
    cp "$PG_BIN_DIR/pg_dump" /output/bin/
    cp "$PG_BIN_DIR/pg_restore" /output/bin/
    cp "$PG_BIN_DIR/psql" /output/bin/

    # Function to copy library dependencies
    copy_lib_deps() {
      local binary="$1"
      ldd "$binary" | grep "=> /" | awk "{print \$3}" | sort | uniq | while read -r lib; do
        if [ -f "$lib" ]; then
          cp "$lib" "/output/lib/$(basename "$lib")"
        fi
      done
    }

    # Copy library dependencies for each binary
    for bin in /output/bin/*; do
      copy_lib_deps "$bin"
    done

    # Copy PostgreSQL specific libraries
    for lib in "$PG_LIB_DIR"/*.so*; do
      if [ -f "$lib" ]; then
        cp "$lib" "/output/lib/$(basename "$lib")"
      fi
    done
  '

# Create the final layer archive
cd lambda-layer-postgres-tools || exit
zip -r ../postgres-tools-layer.zip .
cd ..
echo "Done! Lambda layer created: postgres-tools-layer.zip"
ls -lh postgres-tools-layer.zip