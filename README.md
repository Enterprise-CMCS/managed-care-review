# Managed Care Review ![Build & Deploy](https://github.com/Enterprise-CMCS/managed-care-review/actions/workflows/promote.yml/badge.svg?branch=main)

<a href="https://codeclimate.com/github/Enterprise-CMCS/managed-care-review/maintainability"><img src="https://api.codeclimate.com/v1/badges/9ec6eca87429a4572f67/maintainability" /></a><a href="https://codeclimate.com/github/Enterprise-CMCS/managed-care-review/test_coverage"><img src="https://api.codeclimate.com/v1/badges/9ec6eca87429a4572f67/test_coverage" /></a>
[![CodeQL](https://github.com/Enterprise-CMCS/managed-care-review/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/Enterprise-CMCS/managed-care-review/actions/workflows/codeql.yml)

Managed Care Review is an application that accepts Managed Care contract and rate submissions from states and packages them for review by CMS. It uses a Serverless architecture (services deployed as AWS Lambdas) with React and Node as client/server and GraphQL as the api protocol. The codebase is a Typescript monorepo. An [architectural diagram](.images/architecture.svg) is also available.

## Key Documentation

-   [Managed Care Review Confluence page](https://qmacbis.atlassian.net/wiki/spaces/OY2/pages/2465300483/Managed+Care+Review). Includes an overview of the project, information about planned features, and ADRs (architectural decision records).
-   [`./docs`](./docs) folder. Includes architectural decision records and technical design documents.
-   [`./services`](./services) README files. Includes brief summary of the service and key dependencies.

## Application Requirements

-   [ ] Node.js
-   [ ] Serverless - Get help installing it here: [Serverless Getting Started page](https://www.serverless.com/framework/docs/providers/aws/guide/installation/). Learn more about serverless from the [Serverless Stack tutorial](https://serverless-stack.com/).
-   [ ] Yarn - In order to install dependencies, you need to [install yarn](https://classic.yarnpkg.com/en/docs/install/).
-   [ ] AWS Account - You'll need an AWS account with appropriate IAM permissions (admin recommended) to deploy this app in Amazon.
-   [ ] NVM - If you are on a Mac using nvm, you should be able to install all the dependencies as [described below](#installing-node-and-dependencies).
-   [ ] envrc - Used to set environment variables locally
-   [ ] docker - Used to run postgres locally

### Local Tooling

We use a collection of tools to manage this monorepo.

We use [Lerna](https://github.com/lerna/lerna) to manage commands across the entire monorepo. This tool is good for managing multi-package repositories like ours, where there are several nested `package.json`, typescript, eslint, and prettier configs, potentially with their own rules. We also use [Husky](https://github.com/typicode/husky) to run and organize our pre-commit scripts - e.g. `husky` uses the command `lerna run precommit` to run the specific `precommit` script indicated in each `package.json`.

To get the tools needed for local development, you can run:

```bash
brew tap yoheimuta/protolint
brew install yarn lerna direnv shellcheck protolint detect-secrets
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

Run all the services locally with the command `./dev local`. All of the commands inside of `./dev local` use [Lerna](#lerna-usage) to run the tasks.

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

-   `./dev test web` to run the web tests, watching the results, requires the database to be running.
-   `./dev test api` to run the api tests, watching the results, requires the database to be running.
-   `./dev test browser` to run the cypress browser based tests, this opens the cypress runner and requires an endpoint to test against. By default, runs on localhost (so you should be running the app locally if this is what you intend). To see options for flags cypress accepts see [docs](https://docs.cypress.io/guides/guides/command-line#Commands).
-   `./dev test` (or `dev test check`) to run all the tests that CI runs, once. This will run the web, api, and browser tests, requires the database to be running.
-   Run with flags `./dev test --unit`, `.dev test --online`, to filter down, but still run once.

Clear dependencies

-   `./dev clean`

Run web app locally, but configured to run against a deployed backend

-   `./dev local web --hybrid`
-   For local dev testing, you should push your local branch to deploy a review app and then `./dev local web --hybrid` will connect to that running review app by default.
-   If you want to specify a different instance to run against, you can set the `--hybrid-stage` parameter. For more info about stages/accounts take a gander at the Deploy section below.

### Lerna usage

All of the tasks in `./dev` are for the most part just wrappers around [Lerna](https://github.com/lerna/lerna) commands. Lerna allows us to define scripts in each service's `package.json` file and will then run any script that matches that script's name across the monorepo. For example, if we run `lerna run build`, Lerna will look at every `package.json` in the monorepo for a task called `build` and then execute the script associated with that `build` command.

If we want to run a task scoped to only one or two services, we could instead run something like `lerna run build --scope=app-api --scope=app-web` to only run the build scripts found in `app-api` and `app-web`.

Any script that is added to a `package.json` scripts section can be invoked with `lerna run $scriptName`.

**Style guide**: Any new script added to a `package.json` file should prefer the format of `task:subtask`. For example, `test`, `test:once`, and `test:coverage` rather than `test_once` and `test_coverage`.

#### Run cypress tests in a linux docker container

We've had a number of issues only reproduce in cypress being run in Github Actions. We've added tooling to dev to run our cypress tests locally in a linux docker container which has been able to reproduce those issues. To do so, you'll need to have docker installed and running and run the app locally with `./dev local` like normal to provide the api & postgres & s3 (you could just run those three services if you like). Unfortunately, docker networking is a little weird, so we have to run a separate `web` in order for the cypress tests to be able to reach our app correctly. That's started with `./dev local web --for-docker`. Finally you can run the tests themselves with `./dev test browser --in-docker`. So minimally:

```bash
./dev local --api --postgres --s3
./dev local web --for-docker
./dev test browser --in-docker
```

And since this has to run headless b/c it's in docker, you can see how the test actually worked by opening the video that Cypress records in ./services/cypress/videos

## Updating the Database

We are using Postgres as our primary data store and [Prisma](https://prisma.io) as our interface to it. If you want to modify our database's schema, you must use the [`prisma migrate`](https://www.prisma.io/docs/concepts/components/prisma-migrate) command in app-api. `./dev prisma` forwards all arguments to prisma in app-api.

We describe our database tables and relationships between them in our Prisma schema at /services/app-api/prisma/schema.prisma. If you want to change our database, start by changing [that schema file](https://www.prisma.io/docs/concepts/components/prisma-schema) how you like.

If you want to test that schema before you generate the migration that will be checked in an run by other dev and in dev/val/prod, you can use the [`./dev prisma -- db push`](https://www.prisma.io/docs/guides/database/prototyping-schema-db-push) to make the changes to your current database and generate the matching PrismaClient.

When you're happy with your schema.prisma, use [`./dev prisma -- migrate dev`](https://www.prisma.io/docs/concepts/components/prisma-migrate) to generate a new migration file. (if you have run `prisma db push` you will have to wipe your local db to do so). That file gets checked in and used to make the changes in all other environments.

If you are going to need to modify the migration that prisma generates you can use `./dev prisma -- migrate dev --create-only`. That will generate the migration file but not actually apply it to the database. `./dev prisma -- migrate dev` will apply it.

Whenever you run `./dev postgres` we start a new postgres docker container and run `prisma migrate reset --force` to clean it out and run all of our checked in migrations there. After that you should be ready to develop.

## Build & Deploy

See main build/deploy [here](https://github.com/Enterprise-CMCS/managed-care-review/actions/workflows/promote.yml?query=branch%3Amain)

This application is built and deployed via GitHub Actions. See `.github/workflows`.

This application is deployed into three different AWS accounts: Dev, Val, and Prod. Anytime the main branch is updated (i.e. a PR is merged) we deploy to each environment in turn. If interacting with those accounts directly, each one will require different AWS keys.

In the Dev account, in addition to deploying the main branch, we deploy a full version of the app on every branch that is pushed that is not the main branch. We call these deployments "review apps" since they host all the changes for a PR in a full deployment. These review apps are differentiated by their Serverless "stack" name. This is set to the branch name and all infra ends up being prefixed with it to keep from there being any overlapping.

We have a script (`getChangedServices`) that runs in CI to check if a service needs to be re-deployed due to your most recent commit or if a service can be skipped in order to save CI deploy time. For example, if you're just making changes to `app-web`, it's likely that you won't need to re-deploy any infra services, such as postgres, after an initial branch deploy. However, if you do need your branch to be fully re-deployed, you can add the string `force-ci-run` to your commit message and the entire deploy workflow will be run.

You can see the deploys for review apps [here](https://github.com/Enterprise-CMCS/managed-care-review/actions/workflows/deploy.yml)

### Building scripts

When a script gets too complicated, we prefer it not be written in Bash. Since we're using typescript for everything else, we're writing scripts in typescript as well. They are located in /src/scripts and are compiled along with dev.ts any time you execute `./dev`. They can be invoked like `node build_dev/scripts/add_cypress_test_users.js`

## Infrastructure Dependencies

These dependencies can be installed if you are wanting or needing to run `aws` or serverless `sls` commands locally.

Before beginning, it is assumed you have:

1. Added your public key to your GitHub account
2. Cloned this repo locally

The following should install everything you need on macOS:

```bash
brew install awscli shellcheck
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
└── serverless -> ctkey-wrapper
```

`ctkey-wrapper` is a small bash script that runs the `ctkey` command to generate your temporary
CloudTamer credentials and exports them to your local environment.
With `ctkey-wrapper` in place, you can simply run
`aws` or `serverless` commands in this directory and `ctkey-wrapper` manages all
of the `ctkey` complexity behind the scenes.

First, you'll need to add the following to your `.envrc.local`:

```
# the following add's ./scripts to the head of your PATH
PATH_add ./scripts

export CTKEY_USERNAME=''
export CTKEY_PASSWORD=''
export AWS_ACCOUNT_ID=''
```

Your `CTKEY_USERNAME` and `CTKEY_PASSWORD` should be the credentials you use to log in to EUA. They will need to be updated whenever your EUA password expires and has been rotated.

Your `AWS_ACCOUNT_ID` is the ID of the environment you wish to access locally. Typically this will be the AWS ID of the dev environment.

Currently, `ctkey-wrapper` requires the user to be running the openconnect-tinyproxy
container [here](https://github.com/trussworks/openconnect-tinyproxy) to connect
to Cloudtamer.

### Verify serverless setup

To verify serverless (and AWS access) is set up properly with ctkey, run:

```shell
which serverless # should return something like /managed-care-review/scripts/serverless
which sls # should return something like /managed-care-review/scripts/sls
```

These should both point to paths inside the codebase (not to paths in /usr/local/bin).

Then verify things are working by running any serverless command , e.g. `cd services/app-api && serverless info --stage main`. This command should print information and not return any Serverless Error around "AWS Credentials".

## Adding a Service

The Serverless framework calls encapsulated units of lambdas + AWS infrastructure a "service", so we've inherited this terminology from that project. All of our services live under the `./services/` directory. If you need to add a new service to the project a few things need to happen:

-   `lerna create ${service-name}`. Follow Lerna's prompts and you'll end up with a directory under `./services/` with a generated `package.json` and `README.md` file.
-   Add a `serverless.yml` file to the root directory of this new service. You can copy off of an existing config or run the `serverless` command in `./services/${service-name}` to use one of their starter templates.
-   If this service is going to require js or ts code, you'll want to create a `src` directory as well as copy over the appropriate `tsconfig.json` and `.eslintrc` configs. Refer to one of the existing services to get an idea of how we are currently doing this.

You'll need to add this service to our deployment GitHub Actions workflows:

-   If it is only infrastructure it can be added to `./.github/workflows/deploy-infra-to-env.yml`.
-   Services that include application code can be added to `./.github/workflows/deploy-app-to-env.yml`.
-   We have a CI script that skips branch redeploys when possible in `./scripts/get-changed-services/index.ts`. Make sure your service is added to that list.

## Monitoring

We currently are using Open Telemetry for distributed tracing, with our OTEL exporters pointed to New Relic. In order to access our New Relic dashboard, you'll first need to request access from someone on the team. Once access has been granted, the following should be used to sign in to your account:

1. Open https://one.newrelic.com and log in to your account using your `@teamtrussworks.com` email address.
2. You will be redirected to the CMS SSO for Active Directory in Azure.
3. Log in with an email address consisting of your EUA ID + `@cloud.cms.gov`.
4. Enter your EUA password at the next screen.
5. You should be prompted to choose your MFA type, either by SMS or by phone.
6. Enter your MFA token.

You should now be at our New Relic dashboard where all our OTEL metrics are being displayed.

## Launch Darkly

We currently use the CMS Federal (.us) install of Launch Darkly to manage our feature flags. This can be accessed through [LD Federal](https://app.launchdarkly.us) by providing the email address associated with your EUA account (e.g. `@teamtrussworks.com`), which will redirect you to CMS SSO.

There are technical design docs about [when to add and remove feature flags](docs/technical-design/launch-darkly-feature-flag-lifecycles.md) and [how to test with feature flags](docs/technical-design/launch-darkly-testing-approach.md).

## Contributing

We welcome contributions to this project. MC Review is an internal CMS tool for facilitating the review of state Medicaid contracts. It is developed by a federal contracting team under contract with CMS and is deployed internally for that purpose. MC Review is built using agile development processes and accepts both issues and feature requests via GitHub issues on this repository. If you’d like to contribute back any changes to this code base, please create a Pull Request and a team member will review your work. While this repository is dedicated primarily to delivering MC Review to the government, if you find any parts of it useful or find any errors in the code we would love your contributions and feedback. All contributors are required to follow our [Code of Conduct](./CODE_OF_CONDUCT.md)

## License

[![License](https://img.shields.io/badge/License-CC0--1.0--Universal-blue.svg)](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

See [LICENSE](LICENSE.md) for full details.

```text
As a work of the United States Government, this project is
in the public domain within the United States.

Additionally, we waive copyright and related rights in the
work worldwide through the CC0 1.0 Universal public domain dedication.
```
