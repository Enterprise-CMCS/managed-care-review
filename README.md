# Managed Care Review ![Build & Deploy](https://github.com/CMSgov/managed-care-review/actions/workflows/promote.yml/badge.svg?branch=main)

<a href="https://codeclimate.com/repos/616dbb175e8227015001784f/maintainability"><img src="https://api.codeclimate.com/v1/badges/42503a338d09d6a358a5/maintainability" /></a> <a href="https://codeclimate.com/repos/616dbb175e8227015001784f/test_coverage"><img src="https://api.codeclimate.com/v1/badges/42503a338d09d6a358a5/test_coverage" /></a>

Managed Care Review is an application that accepts Managed Care contract and rate submissions from states and packages them for review by CMS. It uses a Serverless architecture (services deployed as AWS Lambdas) with React and Node as client/server and GraphQL as the api protocol. The codebase is a Typescript monorepo.

Additional sources for documentation:

-   [Managed Care Review Confluence page](https://qmacbis.atlassian.net/wiki/spaces/OY2/pages/2465300483/Managed+Care+Review). Includes an overview of the project, information about planned features, and ADRs (architectural decision records).
-   [`./services`](./services) README files and [`./docs`](./docs)

## Application Requirements

-   [ ] Node.js
-   [ ] Serverless - Get help installing it here: [Serverless Getting Started page](https://www.serverless.com/framework/docs/providers/aws/guide/installation/). Learn more about serverless from the [Serverless Stack tutorial](https://serverless-stack.com/).
-   [ ] Yarn - In order to install dependencies, you need to [install yarn](https://classic.yarnpkg.com/en/docs/install/).
-   [ ] AWS Account - You'll need an AWS account with appropriate IAM permissions (admin recommended) to deploy this app in Amazon.
-   [ ] NVM - If you are on a Mac using nvm, you should be able to install all the dependencies as [described below](#Installing-Node-and-Dependencies).
-   [ ] envrc - Used to set environment variables locally
-   [ ] docker - Used to run postgres locally

### Local Tooling

We use a collection of tools to manage this monorepo.

We use [Lerna](https://github.com/lerna/lerna) to manage commands across the entire monorepo. This tool is good for managing multi-package repositories like ours, where there are several nested `package.json`, typescript, eslint, and prettier configs, potentially with their own rules. We also use [Husky](https://github.com/typicode/husky) to run and organize our pre-commit scripts - e.g. `husky` uses the command `lerna run precommit` to run the specific `precommit` script indicated in each `package.json`.

To get the tools needed for local development, you can run:

```bash
brew tap yoheimuta/protolint
brew install direnv shellcheck protolint
yarn husky install
```

We use [direnv](https://direnv.net/) to automatically set required environment variables when you enter this directory or its children. This will be used when running the application locally, or when using tools like the `aws` or `serverless` CLIs locally.

If you've never setup [direnv](https://direnv.net/) before, add the following to the bottom of your `.bashrc`.

```bash
if command -v direnv >/dev/null; then
    eval "$(direnv hook bash)"
fi
```

If using zsh, add the following to your `.zshrc`

```bash
eval "$(direnv hook zsh)"
```

After adding, start a new shell so the hook runs.

The first time you enter a directory with an `.envrc` file, you'll receive a
warning like:

```text
    direnv: error /some/path/to/.envrc is blocked. Run `direnv allow` to approve its content
```

Run `direnv allow` to allow the environment to load.

### Installing Node and Dependencies

```
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

# load nvm and restart terminal
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# double check your work.
nvm    # should return a list of nvm commands
node -v     # should return v12.20.0
which node    # should return something like /Users/YOURUSER/.nvm/versions/node/v12.20.0/bin/node

# if things aren't working you may need to manually adjust your ~/.bash_profile or ~/.zshrc. See [nvm docs](https://github.com/nvm-sh/nvm#troubleshooting-on-macos) for more.

# install and use the node version specified in .nvmrc
nvm install
nvm use

# install yarn for dependency manage
brew install yarn

# run the app and storybook
./dev local
```

## Local Dev

Run all the services locally with the command `./dev local`

See the above Requirements section if the command asks for any prerequisites you don't have installed.

The ./dev script is written in typescript in `./src`. The entry-point is `./src/dev.ts`, it manages running the moving pieces locally: the API, the database, the file store, and the frontend.

Local dev is built around the Serverless plugin [`serverless-offline`](https://github.com/dherault/serverless-offline). `serverless-offline` runs an API gateway locally configured by `./services/app-api/serverless.yml` and hot reloads your lambdas on every save. The plugin [`serverless-s3-local`](https://github.com/ar90n/serverless-s3-local) stands up the local s3 in a similar fashion.

When run locally (with LOCAL_LOGIN=true), auth bypasses Cognito and uses [`serverless-offline`](https://github.com/dherault/serverless-offline). The frontend mimics login in local storage with mock users and sends an id in the `cognito-identity-id` header on every request. This is set as the cognito Id in the `event.requestContext.identity` for lambdas, just like Cognito would in AWS.

### ./dev Usage

`./dev` is a program for doing development on Managed Care Review. It can run services locally, run tests, lint, and more. Discover everything it can do with `./dev --help`. Anything you find yourself doing as a developer on this project, feel free to add to `./dev`.

Run whole app locally

-   `./dev local` to run the entire app and storybook
-   Available flags: `--storybook`, `--web`, `--api`, `--s3`, '--postgres' for running services individually
-   (you can also exclude services by using the yargs 'no' standard: `./dev local --no-storybook`)

Run individual services locally

-   `./dev local web`
-   `./dev local api`
-   etc

Some of those services have their own options as well, namely app-web, see below for more info

Run tests locally

-   `./dev test web` to run the web tests, watching the results
-   `./dev test api` to run the api tests, watching the results
-   `./dev test browser` to run the cypress browser based tests, this opens the cypress runner and requires an endpoint to test against. By default, runs on localhost (so you should be running the app locally if this is what you intend). To see options for flags cypress accepts see [docs](https://docs.cypress.io/guides/guides/command-line#Commands).
-   `./dev test` (or `dev test check`) to run all the tests that CI runs, once. This will run the web, api, and browser tests
-   Run with flags `./dev test --unit`, `.dev test --online`, to filter down, but still run once.

Clear dependencies

-   `./dev clean`

Run web app locally, but configured to run against a deployed backend

-   `./dev local web --hybrid`
-   For local dev testing, you should push your local branch to deploy a review app and then `./dev local web --hybrid` will connect to that running review app by default.
-   If you want to specify a different instance to run against, you can set the `--hybrid-stage` parameter. For more info about stages/accounts take a gander at the Deploy section below.

#### Run cypress tests in a linux docker container

We've had a number of issues only reproduce in cypress being run in Github Actions. We've added tooling to dev to run our cypress tests locally in a linux docker container which has been able to reproduce those issues. To do so, you'll need to have docker installed and running and run the app locally with `./dev local` like normal to provide the api & postgres & s3 (you could just run those three services if you like). Unfortunately, docker networking is a little weird, so we have to run a separate `web` in order for the cypress tests to be able to reach our app correctly. That's started with `./dev local web --for-docker`. Finally you can run the tests themselves with `./dev test browser --in-docker`. So minimally:

```bash
./dev local --api --postgres --s3
./dev local web --for-docker
./dev test browser --in-docker
```

And since this has to run headless b/c it's in docker, you can see how the test actually worked by opening the video that Cypress records in ./tests/cypress/videos

## Updating the Database

We are using Postgres as our primary data store and [Prisma](https://prisma.io) as our interface to it. If you want to modify our database's schema, you must use the [`prisma migrate`](https://www.prisma.io/docs/concepts/components/prisma-migrate) command in app-api. `./dev prisma` forwards all arguments to prisma in app-api.

We describe our database tables and relationships between them in our Prisma schema at /services/app-api/prisma/schema.prisma. If you want to change our database, start by changing [that schema file](https://www.prisma.io/docs/concepts/components/prisma-schema) how you like.

If you want to test that schema before you generate the migration that will be checked in an run by other dev and in dev/val/prod, you can use the [`./dev prisma -- db push`](https://www.prisma.io/docs/guides/database/prototyping-schema-db-push) to make the changes to your current database and generate the matching PrismaClient.

When you're happy with your schema.prisma, use [`./dev prisma -- migrate dev`](https://www.prisma.io/docs/concepts/components/prisma-migrate) to generate a new migration file. (if you have run `prisma db push` you will have to wipe your local db to do so). That file gets checked in and used to make the changes in all other environments.

Whenever you run `./dev postgres` we start a new postgres docker container and run `prisma migrate reset --force` to clean it out and run all of our checked in migrations there. After that you should be ready to develop.

## Build & Deploy

See main build/deploy [here](https://github.com/CMSgov/managed-care-review/actions/workflows/promote.yml?query=branch%3Amain)

This application is built and deployed via GitHub Actions. See `.github/workflows`.

This application is deployed into three different AWS accounts: Dev, Val, and Prod. Anytime the main branch is updated (i.e. a PR is merged) we deploy to each environment in turn. If interacting with those accounts directly, each one will require different AWS keys.

In the Dev account, in addition to deploying the main branch, we deploy a full version of the app on every branch that is pushed that is not the main branch. We call these deployments "review apps" since they host all the changes for a PR in a full deployment. These review apps are differentiated by their Serverless "stack" name. This is set to the branch name and all infra ends up being prefixed with it to keep from there being any overlapping.

You can see the deploys for review apps [here](https://github.com/CMSgov/managed-care-review/actions/workflows/deploy.yml)

### Building scripts

When a script gets too complicated, we prefer it not be written in Bash. Since we're using typescript for everything else, we're writing scripts in typescript as well. They are located in /src/scripts and are compiled along with dev.ts any time you execute `./dev`. They can be invoked like `node build_dev/scripts/add_cypress_test_users.js`

## Infrastructure Dependencies

These dependencies can be installed if you are wanting or needing to run `aws` or serverless `sls` commands locally.

Before beginning, it is assumed you have:

1. Added your public key to your GitHub account
2. Cloned this repo locally

The following should install everything you need on macOS:

```bash
brew install awscli direnv pre-commit shellcheck
pre-commit install --install-hooks
```

### AWS Access

AWS access is managed via Active Directory and Cloudtamer.

In order to run commands against a live AWS environment you need to configure AWS keys to grant you authorization to do so. You will need this for sure to run the `./dev hybrid` command, and might be necessary to run any serverless commands directly by hand.

We can use the `ctkey` tool to make setting up the appropriate access easier, which is described below.

### ctkey

`ctkey` is a tool provided by Cloudtamer that allows you to generate temporary
AWS access keys from your CLI/terminal using cloudtamer.cms.gov.

See [Getting started with Access Key CLI
tool](https://cloud.cms.gov/getting-started-access-key-cli-tool) for a link to
download the ctkey tool.

Download and unzip the ctkey file onto your local computer. Move the
executable that is applicable to your system (e.g., Mac/OS X) to a directory in
your PATH. Rename the executable to `ctkey`.

To verify things are working, run:

```shell
ctkey --version
```

Mac users: If you get an OS X error about the file not being trusted, go to
System Preferences > Security > General and click to allow ctkey.

### ctkey-wrapper

```text
scripts
├── aws -> ctkey-wrapper
├── ctkey-wrapper
└── sls -> ctkey-wrapper
```

`ctkey-wrapper` is a small bash script that runs the `ctkey` command to set your
AWS environment variables. With `ctkey-wrapper` in place, you can simply run
`aws` or `sls` commands in this directory and `ctkey-wrapper` manages all
of the `ctkey` complexity behind the scenes.

Set the `CTKEY_USERNAME` and `CTKEY_PASSWORD` environment variables in
.envrc.local or another suitable location. These are are the same credentials
used for logging into Cloudtamer and will need to be updated whenever your
Cloudtamer credentials are updated.

Currently, `ctkey-wrapper` requires the user to be running the openconnect-tinyproxy
container [here](https://github.com/trussworks/openconnect-tinyproxy) to connect
to Cloudtamer.

## License

[![License](https://img.shields.io/badge/License-CC0--1.0--Universal-blue.svg)](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

See [LICENSE](LICENSE.md) for full details.

```text
As a work of the United States Government, this project is
in the public domain within the United States.

Additionally, we waive copyright and related rights in the
work worldwide through the CC0 1.0 Universal public domain dedication.
```
