# Dependency Injection

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
