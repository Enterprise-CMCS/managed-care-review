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
    
    # Improved recursive library dependency resolution
    function copy_libs() {
      local bin="$1"
      ldd "$bin" | grep "=> /" | awk "{print \$3}" | while read -r lib; do
        if [ -f "$lib" ] && [ ! -f "/output/lib/$(basename $lib)" ]; then
          cp "$lib" "/output/lib/$(basename $lib)"
          # Recursively check dependencies of this library
          copy_libs "$lib"
        fi
      done
    }
    
    # Copy all dependencies recursively
    for bin in "$PG_DUMP_PATH" "$PG_RESTORE_PATH" "$PSQL_PATH"; do
      if [ -f "$bin" ]; then
        copy_libs "$bin"
      fi
    done
    
    # Additional critical libraries that might be missing
    # These are often required by glibc functions
    for lib in /lib64/libnss_*.so* /lib64/libnsl*.so* /lib64/libdl*.so* /lib64/libpthread*.so* /lib64/libc*.so* /lib64/ld-linux*.so*; do
      if [ -f "$lib" ] && [ ! -f "/output/lib/$(basename $lib)" ]; then
        cp "$lib" "/output/lib/$(basename $lib)"
      fi
    done
    
    # Create wrapper scripts with proper library path handling
    for bin in pg_dump pg_restore psql; do
      echo "#!/bin/bash" > "/output/bin/$bin"
      echo "export LD_LIBRARY_PATH=/opt/lib:\$LD_LIBRARY_PATH" >> "/output/bin/$bin"
      echo "export LD_PRELOAD=/opt/lib/libpthread.so.0" >> "/output/bin/$bin"
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