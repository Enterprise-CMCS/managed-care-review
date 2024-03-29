# Design Patterns

## Naming Conventions

To save on arguments, let's use the same naming conventions as rails/active record for our resolvers and store methods.

GraphQL Resolvers:

-   fetchFoo (this is the only real deviation. showFoo comes from server side rendering which feels off here)
-   createFoo
-   updateFoo
-   deleteFoo
-   indexFoos

Store Methods:

-   findFoo
-   findFooByBar
-   findAllFoo
-   insertFoo
-   updateFoo
-   destroyFoo

VariableNames:

-   always capitalize ID, so programID not programId

## Dependency Injection

Dependency injection is the way we make sure that code is configured with whatever dependencies it requires.

What's a dependency you ask? The most obvious dependencies are things that make requests to other services. So in `app-web`, the graphql client is a dependency. The graphql client also has an additional dependency that we configure - ApolloLink. We manage these dependencies with environment variables. When `AUTH_MODE=LOCAL`, we pass a different link to the Apollo client, injecting the graphql client with a different dependency. The interface to graphql doesn't change in this case, only the dependency it uses changes. This means we can use or test graphql throughout the code base the same way, even in different environments.

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

2.  Write tests where dependencies are _not_ configured with environment variables.

    -   test should run the same no matter the environment
    -   tests should test the different configurations possible
    -   we want to spend the most time testing the business logic of our app, so that's why mocks let us test our code without having to test and confirm that our dependency also is working as expected, its own tests should cover that.

### Another Example:

As mentioned above (and the problem that spurred these docs to be written) some of our resolvers will need to be able to fetch information about the user that is making this request. We get that data very differently locally than we do in a deployed environment. Here are some examples of practices as they evolved in this application.

-   bad: Calling env.process.AUTH_MODE in your handler
    -   the first pass just checked the auth mode env var and then either talked to cognito or didn't, depending.
-   better: passing an authMode: AuthMode variable into a handler
    -   now this is configurable in a test without setting an env var
-   best: passing a `userFetcher` function into a handler
    -   now you know exactly what you might need to mock in a test, and how to mock it, you can just pass a different one.
    -   you've also isolated your dependencies, so that code outside the dependency's package is ignorant of the workings of the code you are calling

### What's Startup time for Lambdas?

Lambda + Apollo server limits our options to some degree. We don't have a traditional app `main()` or `index.ts` to wire everything together in. We have to wire things on every request. There are two good options for passing down dependencies:

#### Option 1: Config wrapper for a type:

Write a wrapping function that takes dependencies as arguments and returns whatever type needs them (a function, whatever)

-   lets us explicitly name dependences for the types we care about
-   how we're passing the userFetcher to resolvers that need it
-   does add a layer of indirection to our resolver types, it's always easier to just have a global to check

#### Option 2: put it in the context

Use the Apollo Server context variable to pass it down to all resolvers. A request logger that is initialized in a middleware is a good example here.

-   great place for "request scoped" dependencies.
-   good way to communicate with middlewares
-   more general, multiple resolvers can pull from the same config
-   we can type the context so it's required to be set
-   that will require setting it even for functions that don't care in tests later on.

### Where do you inject dependencies in React?

React, being a functional framework built around JSX has its own patterns around dependency injection. `index.ts` is the right place to do all your env var parsing and configure your dependencies, but since components in react are often nested quite deep, the simple rule of passing things down can be more difficult.

#### Option 1: Pass it down the props

The first option is just that, though. If a component needs access to something like a connection to a server or a logout function, you can always pass it down via props. You may have to pass it through several intermediate components, but that at least keeps you honest about where configuration is required. It's hard to test a higher level component well without making sure all it's children have the configuration they need

-   Easy and obvious
-   The type checker will complain if you forget a dependency
-   Tests can again be written without ever parsing env vars

#### Option 2: Use a React Context

This is what Apollo Client does and is a good pattern for providing easy access to some kind of shared resource in a variety of components without having to drill props down to arbitrary depths. When you test a component that depends on a context, it won't work unless you wrap that component in a context. And that wrapper can easily be a mock.

-   No more prop drilling, any component that is a child of a context can subscribe to it
-   It's a common pattern for dependency injection in the react world already
-   lets you wrap up your dependency in a nice reactive form, where components can simply re-render in response to changes wrapped up in the context

## Domain Models

Domain models are the internal communication protocol for different parts of our app. Just as GraphQL specifies types for communicating between the client and the server, our domain models are the lingua franca for communication between modules inside app-api and app-web respectively

What that means in practice is that when code in one package need to call code in another package, any arguments and return values that are more complex than primitive types should be domain models. The first example of that is the store package. The store is wrapping up our dependency on the database, exporting functions like insertDraftSubmission and findDraftSubmission. These methods both return the DraftSubmission domain model type as opposed to some type specific to and specified by the store package.

This is another attempt to decrease the coupling of our code. By using the same simple domain models to communicate between services we are less likely to develop enmeshed dependencies on behavior specific to a service.

For example:

Instead of the db returning a db-ified class model called `DraftSubmission` that has `save()` and `refresh()` and `findUploadedFiles()` on it, we write `DraftSubmission` as a domain model. This has only the common fields like `submissionType`, `description`, and `files` that make up the concept of a "draft submission" regardless of service. Then, functions exported by the store package like `updateDraftSubmission`, `findDraftSubmission`, and `findUploadedFiles` can handle this domain model. A side benefit to this is that it's very obvious when code is making calls to the db, because you have to call something from the store package. No matter if you are writing to the database, checking it for the right permissions for the current user, or reporting up on how many Drafts are in progress, the DraftSubmission has the same properties. Using domain models let us define those shared properties without tying that to a specific use case.

There's a kind of functional programming vs. object-oriented-programming thing going on in this pattern, for sure. It can definitely work either way. But what tips the scales for me is separating the definition of our core models away from any particular use case for them.

## Pagination

There is an established pattern for pagination in GraphQL apis that has some funky terminology. We're going to hew to that standard for now. As of June 2021, we don't actually paginate anything, but we're going to build the containers into our index apis so that when we do paginate the client won't have to readjust too hard.

Pagination in graphQL is done through a "connections" pattern, described in detail in the [GraphQL Docs](https://graphql.org/learn/pagination/) and the terminology explained well in [this blogpost](https://www.apollographql.com/blog/graphql/explaining-graphql-connections/). It's a cursor based pagination where individual records are returned as "edges" to the current "node".

The [official specification](https://relay.dev/graphql/connections.htm) has more detail, as well.

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
