#!/bin/bash

# Script to build PostgreSQL tools Lambda layer using Docker
echo "Building PostgreSQL Lambda layer..."

# Ensure we have a clean workspace
rm -rf lambda-layer-postgres-tools
mkdir -p lambda-layer-postgres-tools

# Run build in Amazon Linux 2 container
docker run --rm \
  -v "$(pwd)/lambda-layer-postgres-tools:/output" \
  amazonlinux:2 bash -c '
    # Install PostgreSQL 14 and required tools
    yum install -y which findutils tar gzip
    
    # PostgreSQL 14 installation
    amazon-linux-extras install -y postgresql14
    yum clean metadata
    yum install -y postgresql

    # Create layer directories
    mkdir -p /output/bin /output/lib

    # Find PostgreSQL binaries location
    PG_DUMP_PATH=$(which pg_dump)
    PG_RESTORE_PATH=$(which pg_restore)
    PSQL_PATH=$(which psql)

    # Copy PostgreSQL binaries
    cp "$PG_DUMP_PATH" /output/bin/pg_dump.original
    cp "$PG_RESTORE_PATH" /output/bin/pg_restore.original
    cp "$PSQL_PATH" /output/bin/psql.original

    # Copy shared libraries
    for bin in "$PG_DUMP_PATH" "$PG_RESTORE_PATH" "$PSQL_PATH"; do
      if [ -f "$bin" ]; then
        ldd "$bin" | grep "=> /" | awk "{print \$3}" | while read -r lib; do
          if [ -f "$lib" ] && [ ! -f "/output/lib/$(basename $lib)" ]; then
            cp "$lib" /output/lib/
          fi
        done
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
tar -czvf ../lambda-layer-postgres-tools.tar.gz .
cd ..

echo "Done! Lambda layer created: lambda-layer-postgres-tools.tar.gz"
ls -lh lambda-layer-postgres-tools.tar.gz