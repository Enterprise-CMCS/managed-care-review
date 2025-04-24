#!/bin/bash
# PostgreSQL tools Lambda layer build script for Amazon Linux 2023

# Clean workspace
rm -rf lambda-layers-postgres-tools
mkdir -p lambda-layers-postgres-tools

# Run build in Amazon Linux 2023 container
docker run --rm \
  -v "$(pwd)/lambda-layers-postgres-tools:/output" \
  amazonlinux:2023 bash -c '
    # Update and install packages
    dnf update -y
    dnf install -y postgresql16 postgresql16-client tar gzip

    # Create layer directories
    mkdir -p /output/bin /output/lib

    # Copy PostgreSQL binaries
    cp /usr/bin/pg_dump /output/bin/
    cp /usr/bin/pg_restore /output/bin/
    cp /usr/bin/psql /output/bin/

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
      if [ -f "$bin" ]; then
        copy_lib_deps "$bin"
      fi
    done

    # Copy additional PostgreSQL libraries
    for lib in /usr/lib64/libpq*.so*; do
      if [ -f "$lib" ]; then
        cp "$lib" "/output/lib/$(basename "$lib")"
      fi
    done

    # Verify copied files and version
    echo "Copied binaries:"
    ls -l /output/bin
    /output/bin/pg_dump --version
  '

# Create the final layer archive
cd lambda-layers-postgres-tools || exit
tar -zcf ../postgres-tools-layer.tar.gz .
cd ..
echo "Done! Lambda layer created: postgres-tools-layer.tar.gz"
ls -lh postgres-tools-layer.tar.gz