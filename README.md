# macpro-quickstart-serverless ![Build](https://github.com/CMSgov/macpro-quickstart-serverless/workflows/Build/badge.svg?branch=master)[![latest release](https://img.shields.io/github/release/cmsgov/macpro-quickstart-serverless.svg)](https://github.com/cmsgov/macpro-quickstart-serverless/releases/latest)

A serverless form submission application built and deployed to AWS with the Serverless Application Framework.


## Architecture

![Architecture Diagram](./.images/architecture.png?raw=true)

## Local Dev

Run all the services locally with the command `./dev local`

See the Requirements section if the command asks for any prerequisites you don't have installed.

Local dev is configured in typescript project in `./src`. The entrypoint is `./src/dev.ts`, it manages running the moving pieces locally: the API, the database, the filestore, and the frontend. 

Local dev is built around the Serverless plugin [`serverless-offline`](https://github.com/dherault/serverless-offline). `serverless-offline` runs an API gateway locally configured by `./services/app-api/serverless.yml` and hot reloads your lambdas on every save. The plugins [`serverless-dynamodb-local`](https://github.com/99x/serverless-dynamodb-local) and [`serverless-s3-local`](https://github.com/ar90n/serverless-s3-local) stand up the local db and local s3 in a similar fashion. 

When run locally, auth bypasses Cognito. The frontend mimics login in local storage with a mock user and sends an id in the `cognito-identity-id` header on every request. `serverless-offline` expects that and sets it as the cognitoId in the requestContext for your lambdas, just like Cognito would in AWS. 

## Usage

Run app locally

- `./dev local` to run the entire app and storybook
- Run with flags such as `./dev local --storybook` for just storybook

Run tests locally

- `./dev test` with the app running in another tab for end to end tests
- Run with flags `./dev test --unit`, `.dev test --online`, etc

Clear dependencies

- `./dev clean`
  
### Deploy

See master build [here](https://github.com/CMSgov/macpro-quickstart-serverless/actions?query=branch%3Amaster)

This application is built and deployed via GitHub Actions. See `.github/workflows`.

**Want to deploy from your Mac?**

- Create an AWS account
- Install/configure the AWS CLI
- npm install -g severless
- brew install yarn
- sh deploy.sh## Requirements

## Requirements


Serverless - Get help installing it here: [Serverless Getting Started page](https://www.serverless.com/framework/docs/providers/aws/guide/installation/). Learn more about serverless from the [Serverless Stack tutorial](https://serverless-stack.com/).  

Yarn - In order to install dependencies, you need to [install yarn](https://classic.yarnpkg.com/en/docs/install/). 

AWS Account:  You'll need an AWS account with appropriate IAM permissions (admin recommended) to deploy this app in Amazon.


If you are on a Mac using nvm, you should be able to install all the dependencies like so:
```
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

# load nvm and restart terminal
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# double check your work.
nvm # should return a list of nvm commands
node -v # should return v12.20.0
node which # should return something like /Users/YOURUSER/.nvm/versions/node/v12.20.0/bin/node

# if things aren't working you may need to manually adjust your ~/.bash_profile or ~/.zshrc. See [nvm docs(https://github.com/nvm-sh/nvm#troubleshooting-on-macos)] for more.

# install and use the node version specified in .nvmrc
nvm install
nvm use


# install yarn for dependency manage
brew install yarn

# run the app and storybook
./dev local
```

## Functional Programming Concepts

There are two Functional Programming concepts that we use pervasively inside of guide-wire: Option and Result. If these aren't familiar to you, ask! We've got some good primers on them. 

Option, we are doing in pure Typescript, but with some conventions. 

// When a function can return null, make a new type: OptionalThing = Thing | null

typescript will require you unwrap the optional before you do anything with it:

if (optionalFoo !== null) {
	optionalFoo.bar()
} else {
	// it's nothing
}


For Result, we are using a library called `neverthrow` any time a function can fail, instead of using promise.reject or returning a generic Error, use a Result instead.






## Contributing / To-Do

See current open [issues](https://github.com/mdial89f/quickstart-serverless/issues) or check out the [project board](https://github.com/mdial89f/quickstart-serverless/projects/1)

Please feel free to open new issues for defects or enhancements.

To contribute:
- Fork this repository
- Make changes in your fork
- Open a pull request targetting this repository

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

This project made possible by the [Serverless Stack](https://serverless-stack.com/) and its authors/contributors.  The extremely detailed tutorial, code examples, and serverless pattern is where this project started.  I can't recommend this resource enough.

| [![Mike Dial][dial_avatar]][dial_homepage]<br/>[Mike Dial][dial_homepage] | [![Seth Sacher][sacher_avatar]][sacher_homepage]<br/>[Seth Sacher][sacher_homepage] |
|---|---|

  [dial_homepage]: https://github.com/mdial89f
  [dial_avatar]: https://avatars.githubusercontent.com/mdial89f?size=150
  [sacher_homepage]: https://github.com/sethsacher
  [sacher_avatar]: https://avatars.githubusercontent.com/sethsacher?size=150
