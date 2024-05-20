# Technology

MC-Review is built on Serverless architecture (services deployed as AWS Lambdas) with a React client, Node server, and GraphQL as the api protocol. PostgresAurora is used as the database. The codebase is written primarily in Typescript. Additional technologies of interest are listed below.

## User authentication

### Amplify and Cognito

[Amplify](https://docs.amplify.aws/) is the tool we use for determining authentication permissions via AWS Cognito. The initial authentication is handled through a third party (CMS IDM system) after login all subsequent calls to AWS are mediated by Amplify. Amplify is used across the stack to authenticate things like API calls and s3 uploads.

## Database

### Prisma

[Prisma](https://www.prisma.io) is an ORM for Postgres databases. Prisma generates a typescript [client](https://www.prisma.io/docs/concepts/components/prisma-client) for making queries as well as [migrations](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate) for changing our database to match the desired state.

### Protobuf

Protobuf is a tool for serializing key-value data. Designed for API requests, the serialized format is space efficient and typed. We're using it to encode form data and save it in our database in a single column. Our protobuf schema is located in /services/app-proto/src/state_submission.proto. We serialize our domain models UnlockedHealthPlanFormDataType and LockedHealthPlanFormDataType into byte arrays which we write and read from postgres.

## API handling

### GraphQL

[GraphQL](https://graphql.org/learn/) is a strictly typed protocol built on top of HTTP that exposes your API as a graph of related entities. It uses a schema to define the API and excels in providing easy retrieval of related entities along with any request (see [Queries](https://graphql.org/learn/queries/)).

### Apollo Server

[Apollo Server](https://www.apollographql.com/docs/apollo-server/) is the server for our GraphQL API. GraphQL is a schema based, so Apollo Server, reads the schema, sets up the various GraphQL mutations and queries behind the /graphql endpoint and interacts both with auth and with the database to return proper data to our users.

### Apollo Client

[Apollo Client](https://www.apollographql.com/docs/react/) is a state management library for data coming in from GraphQL to the frontend. It handles all the GraphQL operations from the client side, and caches the data locally. This includes exporting a set of [built-in hooks](https://www.apollographql.com/docs/react/api/react/hooks/) for interacting with graphql requests. Developer tooling is available to assist in debugging requests and cacheing.

### GraphQL Code Generator

[GraphQl Code Generator](https://www.the-guild.dev/graphql/codegen/) compiles typescript files for our API giving us the benefit of typing and more confidence in the types of data in our requests.

## Monitoring

### New Relic

New Relic is used for endpoint monitoring and to observe Open Telemetry data in deployed environments. Read more in [Monitoring](./technical-design/monitoring.md).

### Open Telemetry

Open Telemetry (OTEL) is an ecosystem of tools for collecting data about an application and its services. It provides a standard way to instrument code and is vendor agnostic. We send our OTEL data to New Relic where it helps us assemble tracing of all of our requests and record errors.

### Jaeger

[Jaeger](https://www.jaegertracing.io/) is used to observe Open Telemetry data in local dev. Read more in [Monitoring](./technical-design/monitoring.md)

## React Web Application

### Create React App

[Create React App](https://facebook.github.io/create-react-app) compiles, builds and configures our React client, including scripts, styles, and static assets. See also [react-scripts](https://github.com/facebook/create-react-app/tree/master/packages/react-scripts).

### React Router

[React Router](https://reactrouter.com/) is a React-based tool for declarative routing, allowing us to configure routes with their associated URLs, handle links and navigation within the application, and use data parameters in our urls successfully.

### Formik

[Formik](https://formik.org/docs/overview) is a React-based tool we use for web form development. It holds key information about the current state of a form on the page in a shared context, which makes validations and conditional logic within the form much simpler to maintain.

### United States Web Design System (USWDS)

The [USWDS United States Web Design System](https://designsystem.digital.gov/) is the standard for federal government web design. It is used to provide the main scss classes across the application, along with [`@trussworks/react-uswds`](https://github.com/trussworks/react-uswds) as the component library.

## Testing

More about the MC-Review testing approach can be found in [here](technical-design/testing-approach.md).

### Launch Darkly

[LaunchDarkly](https://launchdarkly.com/implementation/) is a third party feature flag management tool that includes a online dashboard for viewing/auditing/updating flags and SDKs that are integrated into our codebase. The use of feature flags with LaunchDarkly allows us to de-couple the act of delivering code from the act of enabling a new feature to subsets of users. We currently use the CMS provisioned Federal instances that can be accessed through the [SSO portal](https://mo-idp.cms.gov).

### Jest

[Jest](https://jestjs.io/) is a test runner and framework used for unit tests across the entire codebase.

### Cypress

[Cypress](https://www.cypress.io/) is a test runner and framework for end to end testing in a live browser. This is configured in the main application `/cypress`. Test runs for the application can be seen in Github Actions or in [Cypress Dashboard](https://dashboard.cypress.io) for team developers.

### React Testing Library

[Testing library](https://testing-library.com) provides utility functions for testing DOM elements. We use the [version](https://testing-library.com/docs/react-testing-library/intro) specific to React. React Testing Library facilitates tests that find and interact with elements like a user would. It also provides a useful set of [matchers](https://github.com/testing-library/jest-dom#custom-matchers).

### Pa11y and Cypress-Audit

`pa11y` is a tool for accessibility testing. By default, pa11y uses the WCAG2AA standard. We are running pa11y on every page of our form using the cypress-audit library. This allows us to sign in and fill out the form using Cypress, and only rely on pa11y to scan those pages. This is also one place in our app where we have implemented a ratchet in CI. The issues present when we started testing with pa11y have been ignored, allowing CI to ensure that we aren't adding new errors in the future. Tickets have been filed to address those existing issues.

### Storybook

[Storybook](https://storybook.js.org/docs/react/get-started/introduction) is a tool for building and deploying UI components in a isolated sandbox. It is often used for testing and reviewing components in a design library. Any shared component of interest in MC-Review is built with a storybook file for easy reference and testing by the design team.


### Apollo Studio Explorer
[Apollo Studio Explorer](https://www.apollographql.com/docs/graphos/explorer/explorer/) is a web-based IDE for writing and executing GraphQL operations on our deployed GraphQL API, with features such as schema referencing, query linting, autocomplete, and a jump-to-definition tool. The tool allows developers to write and test GraphQL operations without the need for front-end UI to execute the operations. For information on accessing the tool, refer to the [creating-and-testing-endpoints.md](technical-design/creating-and-testing-endpoints.md#apollo-studio-explorer) documentation.
