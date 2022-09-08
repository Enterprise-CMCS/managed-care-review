# 006 — Define approach to automated testing

Define the approach for automated testing within the mc-review app.

## Considerations

-   Ensure we deliver software that uses best practices for automated tests.
-   Reduce divergences in the testing approach between services so it’s easy to go into any service and know how to write tests.
-   Lean into Typescript and benefits we get from working in typescript monorepo.
-   Use testing tools that the dev team has significant experience/skills with or where there is good access to learning resources, to allow quick iteration.

## Chosen Decision

### Continuous Testing

-   Write **unit and integration tests (Jest) alongside each user story or technical task.** Tests will be written for each story on our Jira board. Tests will also be considered in code-reviewed and block merge.
-   Write **end to end tests (Cypress) at the end of every epic**. When we finish the epic we have a good handle on what the expected behaviors are and what areas are not well covered with existing integration tests. End to end tests should focus on multiple step user flows, where the user takes actions across several pages. We assume that single page are already tested with integration tests.
-   Run **unit and integration (Jest) tests on pre-commit** for specific services with file changes.
-   Run **unit, integration and end to end tests before deploys** in CI.

### Test Software How it is Used

-   Write tests to check that actions (api calls, user events) return without errors, display expected UI, or initiate other actions as expected. Often these are integration tests, which also test branching in function logic. Heavy use of unit tests will be reserved for utilities and helpers.

### End to End Tests (Cypress) for User Flow at the Feature Level

-   End to end tests focus on areas we cannot cover with integration tests, specifically the user flow “happy paths” at the feature level.

### Shared tooling for quality assurance

#### Typescript

Working in a Typescript monorepo provides significant controls on our codebase. For example, we can leverage shared typing across services. We do this with static typing of our api models on client and server with [graphql-codegen](https://www.graphql-code-generator.com/). We also have a folder where we store additional domain types and type assertions to be shared between services. Typescript reduces the need for certain types of testing, since we validate the right input type was passed into a function or the correct data types are returned from a function with types. Typescript + eslint raises warnings and errors for these concerns as we write code (we prevent deploy if errors exist).

#### [Jest](https://jestjs.io/) and service-specific helpers

We use Jest as the test runner across all our services. Each service will have a `/test` folder which will store service-specific testing helpers that config tests to the concerns of that service. All tests are written in `*.test.ts(x)` files. These are stored in the folder as well or else alongside code depending on the file structure of the service.

For example, in web code, testing helpers include a function to wrap UI tests in a mocked api and routing handler to facilitate writing tests that require interactions with these middleware. In server code, testing helpers include a function to configure the graphql server for tests.

Jest tests will always be written within a parent [describe block](https://jestjs.io/docs/setup-teardown#order-of-execution-of-describe-and-test-blocks) that matches the name of the function being tested (understanding that React components are also functions).

#### [react-testing-library](https://testing-library.com/) for UI integration tests

This library excels at directly testing functionality through [user events](https://testing-library.com/docs/ecosystem-user-event/). It is also well used for integration testing for UI, for example testing a set of components together that make up a page. We are selecting this library instead of Enzyme (another common library for React testing) for these reasons.Define the approach for automated testing within the guide-wire app. Define the approach for automated testing within the mc-review app.
