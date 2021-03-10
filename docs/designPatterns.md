# Design Patterns

## Dependency Injection

Dependency injection is the way we make sure that code is configured with whatever dependencies it requires.

What's a dependency you ask? The most obvious dependencies are things that make requests to other services. So in `app-web`, the graphql client is an obvious dependency. And actually, that client even has a dependency that we configure which is the fetch ApolloLink. In order to mock out auth locally, we add a header to every API request with the local user in it. So when `AUTH_MODE=LOCAL`, we pass a different link to the Apollo client, a different dependency.

Another related example: in `app-api`, we get info about the current user which also needs to behave differently locally than when deployed. So we have a `userFromAuthProvider` interface that we build two implementations for. One for local, one for cognito, and at startup time we configure which one the handler is going to use. In tests, it's easy to configure our handler to use the one we want, or a mock one that meets the same interface.

Other common dependencies include loggers, database interfaces, auth APIs, etc.

Some telling signs that something might be a dependency:

-   It's an interface to code that you didn't write
-   It's configurable
-   It needs to be mocked in tests
-   It needs to be configured differently locally
-   It needs to be configured differently in dev and in prod
-   You have the urge to put it in a global variable

Once you've identified something as a dependency, here are some best practices for configuring it:

1.  Running applications/services should be configured through environment variables.

    -   See https://12factor.net/config for a detailed breakdown of why this is a good idea
    -   HOWEVER, in order to best inject your dependencies, those environment variables should be read once at application start up and then never again
    -   So, when an app starts up in main() or index.ts, you should read your environment variables and then configure the app in code based on what those environment variables are.

2.  This should set you up to be able to write tests that where dependencies are _not_ configured with environment variables.
    -   test should run the same no matter the environment
    -   tests should test the different configurations possible
    -   we want to spend the most time testing the business logic of our app, so that's why mocks let us test our code without having to test and confirm that our dependency also is working as expected, its own tests should cover that.

### An Example:

As mentioned above (and the problem that spurred these docs to be written) some of our resolvers will need to be able to fetch information about the user that is making this request. We get that data very differently locally than we do in a deployed environment. Here is the evolution of my strategy for doing this?

-   bad: Calling env.process.AUTH_MODE in your handler
    -   the first pass just checked the auth mode env var and then either talked to cognito or didn't, depending.
-   better: passing an authMode: AuthMode variable into a handler
    -   now this is configurable in a test without setting an env var
-   best: passing a `userFetcher` function into a handler
    -   now you know exactly what you might need to mock in a test, and how to mock it, you can just pass a different one.
    -   you've also isolated your dependencies, so that code outside the dependency's package is ignorant of the workings of the code you are calling

### What's Startup time for Lambdas?

Lambda + Apollo server limits our options to some degree. We don't have a traditional app `main()` or `index.ts` to wire everything together in. We have to wire things on every request. There are two good options for passing down dependencies:

-   Option 1: Config wrapper for a type
    -   write a wrapping function that takes dependencies as arguments and returns whatever type needs them (a function, whatever)
    -   lets us explicitly name dependences for the types we care about
    -   how we're passing the userFetcher to resolvers that need it
    -   does add a layer of indirection to our resolver types, it's always easier to just have a global to check
-   Option 2: put it in the context
    -   great place for "request scoped" dependencies.
    -   the request logger will go here
    -   good way to communicate with middlewares
    -   more general, multiple resolvers can pull from the same config
    -   we can type the context so it's required to be set
    -   that will require setting it even for functions that don't care in tests later on.

## Future Work

-   Testing
    -   Unit
        -   fe/be
    -   end to end
-   Dependency Injection / Wiring
    -   Jest lets you mock imports -- figure out how that works with typescript
-   Error handling
    -   Neverthrow?
    -   How does apollo/RQ return / discriminate errors
    -   KnownError?
    -   GOALS
        1. make it hard to ignore errors
        2. 'throw' errors if you dont' care?
           fn bar() -> Result<(), Error> {
           let value = try!(foo);
           // Use value ...
           }
-   Modules
    -   use index.ts to be explicit about what is exported to the rest of the app
    -   inside a package you can have individual files export more so that they can be more easily tested.
-   Typescript
    -   Union types versus enums
-   Local Dev
    -   Monorepo?
        -   https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript
        -   In Sublime Text use LSP + typescript-language-server
    -   Environment variables
    -   Editor support
        -   Types
        -   linting
-   Logging
    -   FE Strategy for event
    -   BE strategy for requests
-   DB
    -   End-to-end type safety
    -   Pattern that lets us swap out for pg one day
-   APIs
    -   Api Errors
    -   Naming conventions
-   React Components
    -   Naming conventions
    -   Composition conventions
    -   Scss scoped to component using uswds design tokens

This maybe could be linked in the PR template, these are all things we'd want to watch for as we do reviews.
