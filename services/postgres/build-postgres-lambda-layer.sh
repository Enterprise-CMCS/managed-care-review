#!/bin/bash
# Script to build PostgreSQL tools Lambda layer using Docker with official PostgreSQL repo
echo "Building PostgreSQL Lambda layer..."
# Ensure we have a clean workspace
rm -rf lambda-layer-postgres-tools
mkdir -p lambda-layer-postgres-tools
# Run build in Amazon Linux 2 container
docker run --rm \
  -v "$(pwd)/lambda-layer-postgres-tools:/output" \
  amazonlinux:2 bash -c '
    # Install prerequisites
    yum install -y yum-utils which findutils tar gzip wget

    # Add PostgreSQL official repository
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    
    # Install PostgreSQL 14 client only (not the server)
    yum install -y postgresql14
    
    # Create layer directories
    mkdir -p /output/bin /output/lib
    
    # Find PostgreSQL binaries location
    PG_BIN_DIR="/usr/pgsql-14/bin"
    PG_DUMP_PATH="$PG_BIN_DIR/pg_dump"
    PG_RESTORE_PATH="$PG_BIN_DIR/pg_restore"
    PSQL_PATH="$PG_BIN_DIR/psql"
    
    # Copy PostgreSQL binaries
    cp "$PG_DUMP_PATH" /output/bin/pg_dump.original
    cp "$PG_RESTORE_PATH" /output/bin/pg_restore.original
    cp "$PSQL_PATH" /output/bin/psql.original
    
    # Copy all needed libraries - use ldd more carefully
    for bin in "$PG_DUMP_PATH" "$PG_RESTORE_PATH" "$PSQL_PATH"; do
      if [ -f "$bin" ]; then
        ldd "$bin" | grep "=> /" | awk "{print \$3}" | sort | uniq | while read -r lib; do
          if [ -f "$lib" ]; then
            cp "$lib" "/output/lib/$(basename $lib)"
          fi
        done
      fi
    done
    
    # Look for PostgreSQL specific libraries that might be needed
    for lib in /usr/pgsql-14/lib/*.so*; do
      if [ -f "$lib" ]; then
        cp "$lib" "/output/lib/$(basename $lib)"
      fi
    done
    
    # Create wrapper scripts
    for bin in pg_dump pg_restore psql; do
      echo "#!/bin/bash" > "/output/bin/$bin"
      echo "export LD_LIBRARY_PATH=/opt/lib:\$LD_LIBRARY_PATH" >> "/output/bin/$bin"
      echo "/opt/bin/$bin.original \"\$@\"" >> "/output/bin/$bin"
      chmod +x "/output/bin/$bin"
    done
  '
# Create the final layer archive
cd lambda-layer-postgres-tools || exit
tar -zcf ../postgres-tools.tar.gz .
cd ..
echo "Done! Lambda layer created: postgres-tools.tar.gz"
ls -lh postgres-tools.tar.gz