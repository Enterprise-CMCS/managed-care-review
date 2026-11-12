# Local setup prompt for an AI coding agent

Hand this file to an AI coding agent (for example Claude Code) running in the repo root. It sets up Managed Care Review on a new macOS machine. The steps and known problems come from a real first-time setup on Apple Silicon macOS.

---

## Prompt

You are helping a developer set up Managed Care Review (MC-Review) for local development on macOS. Work through the phases below in order. After each phase, check the result before you continue. Tell the developer what you did and what they must do themselves.

### Ground rules

- **Read first.** Read `README.md` and `AGENTS.md`. `AGENTS.md` lists skills in `skills/` that you should load before you change code. You do not need them for setup.
- **Check before you install.** Find out what is already installed (step 1). Install only what is missing.
- **The developer owns their shell startup files.** Do not try to write `~/.zshrc` or `~/.bashrc` yourself. Permission guardrails usually block it, and the developer should see what goes into those files. Give the developer the exact text to add.
- **Do not pipe remote scripts into a shell** (`curl ... | bash`). Use Homebrew instead.
- **The developer runs the long-running dev server.** `./dev local` works best in the developer's own terminal. See phase 5 for the reasons.
- **Never reset a database without explicit consent.** See phase 5.
- **Local only.** You do not need AWS, `ctkey`, Serverless, or `.envrc.local` to run the app locally. Set them up only if the developer asks for hybrid mode or deploy work.

### Phase 1: Check the machine

Run a check like this one and report what is missing:

```bash
for t in brew node pnpm direnv entr shellcheck detect-secrets tofu docker code; do
  printf "%-15s " $t; (command -v $t >/dev/null && ($t --version 2>&1 | head -1)) || echo MISSING
done
docker info >/dev/null 2>&1 && echo "docker daemon up" || echo "docker daemon NOT running"
cat .nvmrc   # required Node version
grep packageManager package.json   # required pnpm version
```

- If Homebrew is missing, ask the developer to install it from https://brew.sh. Stop here until it is installed.
- If Docker Desktop is missing, ask the developer to install it. If it is installed but not running, run `open -a Docker`.

### Phase 2: Install tools

```bash
brew install pnpm direnv entr shellcheck detect-secrets opentofu nvm
mkdir -p ~/.nvm
```

Install nvm with Homebrew. Do not use the `curl | bash` installer from the nvm docs.

Install the Node version in `.nvmrc`:

```bash
export NVM_DIR="$HOME/.nvm"; . /opt/homebrew/opt/nvm/nvm.sh
nvm install
~/.nvm/versions/node/$(cat .nvmrc)/bin/node -v   # check it
```

Do not pipe `nvm install` into another command (for example `nvm install | tail`). The pipe runs nvm in a subshell, so the PATH change is lost and `node` looks missing even though the install worked.

The repo pins pnpm in `package.json` (`packageManager`). The pnpm from Homebrew switches to the pinned version automatically, so do not install a specific pnpm version yourself.

### Phase 3: Shell configuration (the developer does this)

Ask the developer to add these lines to their shell startup file, then open a new terminal. Give them this zsh version, or change `zsh` to `bash` if they use bash:

```bash
cat >> ~/.zshrc <<'EOF'
# nvm (installed via Homebrew)
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"

# direnv (keep last)
eval "$(direnv hook zsh)"
EOF
```

Check that it works with `zsh -ic 'node -v; command -v direnv'`. The Node version must be the same as `.nvmrc`.

Then run this in the repo root:

```bash
direnv allow .
```

`.envrc` sets every environment variable that local development needs. It sets `VITE_APP_AUTH_MODE=LOCAL`, `DATABASE_URL` (local Docker Postgres), the LocalStack S3 URLs, and the ports. Do not edit `.envrc`. Put personal overrides in `.envrc.local`, which git ignores.

### Phase 4: VS Code extensions

If `code` is not on the PATH, ask the developer to open the VS Code Command Palette and run "Shell Command: Install 'code' command in PATH". Then run:

```bash
for e in oxc.oxc-vscode esbenp.prettier-vscode Prisma.prisma GraphQL.vscode-graphql \
         vitest.explorer launchdarklyofficial.launchdarkly \
         streetsidesoftware.code-spell-checker ms-azuretools.vscode-docker mkhl.direnv; do
  code --install-extension $e
done
```

| Extension              | Why                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Oxc (`oxc.oxc-vscode`) | **Required.** The repo uses oxlint, not ESLint. It is in `.vscode/extensions.json`.                       |
| Prettier               | Formatting, with the repo's `.prettierrc`.                                                                |
| Prisma                 | For `services/app-api/prisma/schema.prisma`.                                                              |
| GraphQL                | For `services/app-graphql/src/schema.graphql`.                                                            |
| Vitest                 | All unit tests use Vitest.                                                                                |
| LaunchDarkly           | Feature flags. The ID is `launchdarklyofficial.launchdarkly`. `launchdarkly.launchdarkly` does not exist. |
| Code Spell Checker     | The workspace settings define a word list for it.                                                         |
| Docker, direnv         | Useful extras.                                                                                            |

Known problems:

- When the LaunchDarkly extension installs, it can remove the `launchdarkly.project` and `launchdarkly.env` lines from `.vscode/settings.json`. If `git status` shows that file as modified, run `git checkout .vscode/settings.json` so the change does not go into a PR.
- The debug configurations in `.vscode/launch.json` are old. They point at `react-scripts` and `jest`, but the repo uses Vitest. Tell the developer to debug tests with the Vitest extension.

### Phase 5: Start the app

**Recommended:** the developer runs this in their own terminal:

```bash
./dev local
```

`./dev local` runs `pnpm install` itself, so you do not need a separate install step. It then starts Postgres, LocalStack and Jaeger in Docker, resets and migrates the database, builds the shared packages, and starts the web app, the API and the local dev console.

Why the developer should run it, not you:

1. **The database reset guard.** `./dev local` always runs `prisma migrate reset --force`. Prisma detects AI agents and refuses to reset unless the user explicitly consents. If you run it and the reset is blocked:
    - Check the target. It must be `localhost:5432` (the `mcr-postgres` container). Look for the `Datasource "db"` line in the output.
    - Use your structured question tool (or a clear question) to ask the developer for consent. Explain that the reset deletes all data in the local database and must never run against production.
    - Run again only after an explicit "yes", with `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION='<the developer's exact consent text>'`.
2. **A terminal is required.** The `packages:watch` step uses `entr`, which needs a terminal. When an agent runs `./dev local` in the background, this step fails with `entr: unable to get terminal attributes`. The app still runs, but changes to `packages/` are not rebuilt automatically.
3. **Leftover processes.** If you stop your background task, the Vite and API node processes can keep running and hold the ports. See phase 7.

### Phase 6: Check that the app works

The services listen on `127.0.0.1`, not `::1`. If you send a request to `localhost`, it can fail because it goes over IPv6, so use `127.0.0.1`:

```bash
curl -s -o /dev/null -w "web %{http_code}\n"     http://127.0.0.1:3000
curl -s -o /dev/null -w "api %{http_code}\n"     http://127.0.0.1:3030/local/health_check
curl -s -o /dev/null -w "console %{http_code}\n" http://127.0.0.1:3031
docker ps --format '{{.Names}} {{.Status}}'   # mcr-postgres, mcr-localstack, mcr-jaeger
```

| Service                                        | URL                                      |
| ---------------------------------------------- | ---------------------------------------- |
| Web app                                        | http://127.0.0.1:3000                    |
| API health check                               | http://127.0.0.1:3030/local/health_check |
| Local dev console (feature flags, email inbox) | http://127.0.0.1:3031                    |
| Jaeger (traces)                                | http://localhost:16686                   |

### Phase 7: Known problems

| Symptom                                                                                                                                                      | Cause                                                                                                                                                                                                                                                      | Fix                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local-dev-console` crashes with `Cannot find package .../@mc-review/common-code/build/index.js` and nodemon prints `app crashed - waiting for file changes` | The console started before the shared packages finished building.                                                                                                                                                                                          | Run `touch services/local-dev-console/src/server/flagStore.ts` (or save any file in that service). Nodemon restarts the console.                                                                                                               |
| `Failed to create bucket "local-uploads" (it may already exist)`                                                                                             | The LocalStack buckets already exist.                                                                                                                                                                                                                      | You can usually ignore this. If file uploads fail, look here first.                                                                                                                                                                            |
| `NO_USER info set, returning 403` in the API log                                                                                                             | This is expected. In local auth mode, the web app sends `NO_USER` when no mock user is logged in (`services/app-web/src/api/localGQLFetch.ts`). The API returns 403 (`services/app-api/src/handlers/apollo_gql.ts`), and the web app shows the login page. | No action. It is a problem only if requests fail while a user is logged in. In that case, clear local storage for `127.0.0.1:3000` and log in again.                                                                                           |
| `DeprecationWarning: Calling client.query() when the client is already executing a query`                                                                    | A warning from the `pg` library.                                                                                                                                                                                                                           | No action.                                                                                                                                                                                                                                     |
| Ports 3000, 3030 or 3031 are still in use after you stop `./dev local`                                                                                       | Child node processes are still running.                                                                                                                                                                                                                    | Run `lsof -nP -iTCP:3000,3030,3031 -sTCP:LISTEN`. Use `ps -o pid,lstart,command -p <pid>` to confirm each process came from this repo's dev run, then kill it. You can leave the Docker containers running, because `./dev local` reuses them. |

### Done

Setup is complete when all of these are true:

- Web, API and console all return 200.
- The developer can log in as a mock user at http://127.0.0.1:3000.
- `git status` shows no unexpected changes.

Give the developer a short summary: what you installed, what they did themselves, and any problems from the table above that came up.
