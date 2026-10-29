# CI environment setup

The default `shared` mode installs workspace dependencies without downloading
Cypress's desktop binary. Its cache contains only the pnpm store, so native
runners never need access to `/root/.cache/Cypress`.

`cypress-read-write` (the early cache warmer) and `cypress-read-only` (test
workers) also restore, explicitly install, and verify the Cypress binary. Only
the warmer saves those caches, after verification succeeds. Store cache keys
include architecture and the Node, package-manager, lockfile, and workspace
inputs; the binary cache remains keyed by OS, architecture, and Cypress version.

`install.sh` retries dependency installation and explicit Cypress downloads up
to three times, waiting ten seconds between attempts. Exhausted retries preserve
the last command's exit status. Cypress verification failures are not retried or
ignored. The skip-download flag is scoped to dependency installation, not later
steps, so it cannot disable the explicit binary install.

Run the offline regression tests with:

```sh
node --test .github/actions/setup_env/install.test.mjs
shellcheck .github/actions/setup_env/install.sh
```

`Validate PRs` runs these tests and the Postgres unit tests on GitHub's PR merge
result. This catches the missing-Vitest symptom of a stale lockfile integration,
even when branch-only review deployment tests passed. To enforce that gate,
repository administrators must make `Validate PR` a required status check and
require branches to be up to date (or use a merge queue). Those repository
settings are not changed by this action.
