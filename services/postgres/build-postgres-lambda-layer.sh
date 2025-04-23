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
    # Install PostgreSQL 14
    amazon-linux-extras enable postgresql14
    yum clean metadata
    yum install -y postgresql tar gzip

    # Create layer directories
    mkdir -p /output/bin /output/lib

    # Copy PostgreSQL binaries
    cp $(which pg_dump) /output/bin/pg_dump.original
    cp $(which pg_restore) /output/bin/pg_restore.original
    cp $(which psql) /output/bin/psql.original

    # Copy shared libraries
    for bin in pg_dump pg_restore psql; do
      ldd $(which $bin) | grep "=> /" | awk "{print \$3}" | while read -r lib; do
        if [ -f "$lib" ] && [ ! -f "/output/lib/$(basename $lib)" ]; then
          cp "$lib" /output/lib/
        fi
      done
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