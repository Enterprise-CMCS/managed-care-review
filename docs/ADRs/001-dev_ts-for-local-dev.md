# 001 — Use dev.ts for local development and deployment scripting

The local development / deployment system is crucial to writing reliable code. Sometimes called a "build system" its responsibilities always end up including more than just building software. It's the interface for running code locally, responsible for installing dependencies, and it can be responsible for deploying code as well, ideally reducing the size of a given CI system's script. There are a number of different important goals that need to be met by a good one:

-   Fast iteration speed
-   Ability to run all tests as in CI
-   Ability to smoothly onboard new people to the project
-   Standardization of the working environment to reduce “it works on my machine” bugs
-   Encode dependencies so that there is not a long manual list of prereqs before you can run anything locally
-   Expose an operator interface to your application

## Considered Options

-   Make
    -   Make is a venerable tool. It’s been around forever and allows you to easily construct tasks that depend on other tasks
-   Docker-compose
    -   Docker compose is a task runner for docker containers, it allows you to easily set up a web of services locally, both with the code you are writing and the services they depend on running together
-   dev.ts
    -   Dev.ts is a custom standalone program written in typescript that is responsible for running your local dev environment and building/deploying your code from CI
    -   It will be called like any other command line tool with subcommands for different features that a developer might want.

## Chosen Decision

We are going to use dev.ts to be the overall entry-point for operating our application. It will host the local dev task, the testing task, the build task, and the deploy task, to start. Local development will monitor the logs from all of our services, and CI will have very little logic in it, it will just invoke dev.ts commands.

### Pro/Cons

#### Make

-   `+` it is installed by default everywhere
-   `+` it is an old and well documented tool
-   `+` there are patterns for setting up dependencies once for a given task
-   `-` most people don’t know how it works, these days
-   `-` Makefiles get unwieldy, usually
-   `-` make does not allow easily for command line arguments, you often have to make parallel tasks just to accommodate different options

#### Docker-compose

-   `+` encourages you to encapsulate all your dependencies as docker containers which is a great boundary
-   `+` it lets you turn off services in your compose-cluster at will
-   `+` docker is a very standard environment, reduces “it works on my machine” about as much as possible
-   `-` so long as we’re using serverless we’re not deploying a docker container, so none of the code we are writing directly has a natural home in docker-compose
-   `-` you still need some sort of system like make to define tasks like testing and building

#### Dev.ts

-   `+` allows for a well designed unixy interface to operating the application
-   `+` it’s just code, so anyone who wants to make changes to it can see exactly how
-   `+` we can write our own custom patterns for determining when to re-run tasks
-   `+` we can have separate sub-commands for local development, building, and deploying. All of that can live in the same place
-   `+` we can have command line options passed into the commands
-   `-` bootstrapping the script is going to be a little bit tricky
-   `-` It could encourage us to wrap other systems too tightly instead of just exposing their complexity

### Reversing this decision

If dev.ts proves unwieldy for some reason, we can switch over to a Makefile instead. Perhaps make + docker-compose for our dependencies.
