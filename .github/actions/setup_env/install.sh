#!/usr/bin/env bash
set -euo pipefail

# Lifecycle scripts (including Prisma's engine download) can fail on transient
# network errors. Keep retries bounded and preserve the last failure's status.
retry() {
    local attempt status
    for attempt in 1 2 3; do
        if "$@"; then
            return 0
        else
            status=$?
        fi

        if (( attempt < 3 )); then
            echo "::warning::Install attempt $attempt failed (exit $status); retrying in 10 seconds."
            sleep 10
        fi
    done

    return "$status"
}

case "${1:-}" in
    dependencies)
        # Limit these variables to this process. In particular, do not persist
        # CYPRESS_INSTALL_BINARY=0 into the later explicit Cypress install.
        export CYPRESS_INSTALL_BINARY=0
        export PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x
        retry pnpm install --frozen-lockfile
        ;;
    cypress)
        retry pnpm exec cypress install
        # A bad binary must fail setup, never be saved to the binary cache.
        pnpm exec cypress verify
        ;;
    *)
        echo 'Usage: install.sh dependencies|cypress' >&2
        exit 2
        ;;
esac
