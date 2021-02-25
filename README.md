# Guide Wire ![Build](https://github.com/CMSgov/guide-wire/workflows/Build/badge.svg?branch=main)[![latest release](https://img.shields.io/github/release/cmsgov/guide-wire.svg)](https://github.com/cmsgov/guide-wire/releases/latest)

The Managed Care Rate and Review State Submission System

## Local Dev

Run all the services locally with the command `./dev local`

See the Requirements section if the command asks for any prerequisites you don't have installed.

Local dev is configured in typescript project in `./src`. The entry-point is `./src/dev.ts`, it manages running the moving pieces locally: the API, the database, the file store, and the frontend.

Local dev is built around the Serverless plugin [`serverless-offline`](https://github.com/dherault/serverless-offline). `serverless-offline` runs an API gateway locally configured by `./services/app-api/serverless.yml` and hot reloads your lambdas on every save. The plugins [`serverless-dynamodb-local`](https://github.com/99x/serverless-dynamodb-local) and [`serverless-s3-local`](https://github.com/ar90n/serverless-s3-local) stand up the local db and local s3 in a similar fashion.

When run locally (with LOCAL_LOGIN=true), auth bypasses Cognito and uses [`serverless-offline`](https://github.com/dherault/serverless-offline). The frontend mimics login in local storage with mock users and sends an id in the `cognito-identity-id` header on every request. This is set as the cognito Id in the `event.requestContext.identity` for lambdas, just like Cognito would in AWS.

## Usage

Run app locally

-   `./dev local` to run the entire app and storybook
-   Available flags: `--storybook`, `--web`, `--api`, `--s3` for running services individually

Run tests locally

-   `./dev test` with the app running in another tab for end to end tests
-   Run with flags `./dev test --unit`, `.dev test --online`, etc

Clear dependencies

-   `./dev clean`

Run web app locally, but configure it to run against a deployed backend

-   `./dev hybrid`
-   For local dev testing, you should push your local branch to deploy a review app and then `./dev hybrid` will connect to that running review app by default.
-   If you want to specify a different instance to run against, you can set the `--stage` parameter. For more info about stages/accounts take a gander at the Deploy section below.

## AWS Keys

In order to run commands against a live AWS environment you need to configure AWS keys to grant you authorization to do so. You will need this for sure to run the `./dev hybrid` command, and might be necessary to run any serverless commands directly by hand.

You can get keys out of Cloudtamer, on the VPN. Click "Cloud Access" on the account you want access to. Then the account > the access type > "Short-term access keys"

From there it's up to you how to make things work locally. Either set the three environment variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` or put the values in your `~/.aws/credentials` file before invoking the command you want to invoke. I usually just throw the env vars into my .env file and everything works.

### Deploy

See main build [here](https://github.com/CMSgov/guide-wire/actions?query=branch%3Amain)

This application is built and deployed via GitHub Actions. See `.github/workflows`.

This application is deployed into three different AWS accounts: Dev, Val, and Prod. Anytime the main branch is updated (i.e. a PR is merged) we deploy to each environment in turn. If interacting with those accounts directly, each one will require different AWS keys.

In the Dev account, in addition to deploying the main branch, we deploy a full version of the app on every branch that is pushed that is not the main branch. We call these deployments "review apps" since they host all the changes for a PR in a full deployment. These review apps are differentiated by their Serverless "stack" name. This is set to the branch name and all infra ends up being prefixed with it to keep from there being any overlapping.

## Requirements

Serverless - Get help installing it here: [Serverless Getting Started page](https://www.serverless.com/framework/docs/providers/aws/guide/installation/). Learn more about serverless from the [Serverless Stack tutorial](https://serverless-stack.com/).

Yarn - In order to install dependencies, you need to [install yarn](https://classic.yarnpkg.com/en/docs/install/).

AWS Account: You'll need an AWS account with appropriate IAM permissions (admin recommended) to deploy this app in Amazon.

If you are on a Mac using nvm, you should be able to install all the dependencies like so:

```
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

# load nvm and restart terminal
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# double check your work.
nvm    # should return a list of nvm commands
node -v     # should return v12.20.0
node which    # should return something like /Users/YOURUSER/.nvm/versions/node/v12.20.0/bin/node

# if things aren't working you may need to manually adjust your ~/.bash_profile or ~/.zshrc. See [nvm docs](https://github.com/nvm-sh/nvm#troubleshooting-on-macos) for more.

# install and use the node version specified in .nvmrc
nvm install
nvm use


# install yarn for dependency manage
brew install yarn

# run the app and storybook
./dev local
```

## Contributing / To-Do

See current open [issues](https://github.com/CMSgov/guide-wire/pulls/issues)

Please feel free to open new issues for defects or enhancements.

To contribute:

-   Fork this repository
-   Make changes in your fork
-   Open a pull request targeting this repository

Pull requests are being accepted.

## License

[![License](https://img.shields.io/badge/License-CC0--1.0--Universal-blue.svg)](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

See [LICENSE](LICENSE.md) for full details.

```text
As a work of the United States Government, this project is
in the public domain within the United States.

Additionally, we waive copyright and related rights in the
work worldwide through the CC0 1.0 Universal public domain dedication.
```

### Contributors

This project made possible by the [Serverless Stack](https://serverless-stack.com/) and its authors/contributors. The extremely detailed tutorial, code examples, and serverless pattern is where this project started. I can't recommend this resource enough.

| [![Mike Dial][dial_avatar]][dial_homepage]<br/>[Mike Dial][dial_homepage] | [![Seth Sacher][sacher_avatar]][sacher_homepage]<br/>[Seth Sacher][sacher_homepage] |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |

[dial_homepage]: https://github.com/mdial89f
[dial_avatar]: https://avatars.githubusercontent.com/mdial89f?size=150
[sacher_homepage]: https://github.com/sethsacher
[sacher_avatar]: https://avatars.githubusercontent.com/sethsacher?size=150
