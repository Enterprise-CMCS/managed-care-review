# Guidewire Technology

These are all pieces of technology we rely on with resources to help learn them.

## Prisma

An ORM for Typescript + Postgres. We define the tables and relationships we want in our database in our /services/app-api/prisma/schema.prisma file. Prisma generates a typescript client for making queries as well as migrations for changing our database to match the desired state.

-   https://www.prisma.io
-   https://www.prisma.io/docs/concepts/components/prisma-schema
-   https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate
-   https://www.prisma.io/docs/concepts/components/prisma-client

## DynamoDB

An AWS native datastore.

A great conceptual intro into how tables/indicies work:

-   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
-   https://www.dynamodbguide.com/what-is-dynamo-db
-   https://www.youtube.com/watch?v=HaEPXoXVf2k&t=57s

## React Testing Library

Testing library is a javascript test framework for DOM based tests. It lets us write tests where we render into the DOM, then find and interact with elements there like a user would. The library isn't huge so the docs are very accessible.

https://testing-library.com/docs/

the expect matchers are from jest-dom: https://github.com/testing-library/jest-dom#custom-matchers

## Protobuf

Protobuf is a tool for serializing key-value data. Designed for API requests, the serialized format is space efficient and typed. We're using it to encode form data and save it in our database in a single column. Our protobuf schema is located in /services/app-proto/src/state_submission.proto. We serialize our domain models DraftSubmissionType and StateSubmissionType into byte arrays which we write and read from postgres.

## Apollo Client

This is a complicated tool. It handles all the GraphQL operations from the client side, and caches the data locally. The docs are good but it's complicated so building stuff and reading the docs at the same time is the most helpful. There are helpful debugging tools for chrome, pretty much required when getting into the nitty gritty of caching behavior.

### cypress

We have end to end testing (in the live browser) with [cypress](https://www.cypress.io/). This is configured in the main application `/cypress`.

### pa11y

`pa11y` is a tool for accessibility testing. `pa11y-ci` is a tool to against the list of urls declared in the config file or a sitemap (if configured). To run locally, you need to global install [pa11y-ci](https://github.com/pa11y/pa11y-ci) `yarn global add pa11y-ci`. For context, By default, pa11y uses the WCAG2AA standard.

If you would like to run pa11y against individual urls or with custom config as part of local development, consider installing plain ol' [pa11y](https://github.com/pa11y/pa11y) `yarn global add pa11y`. This allows you to do things like `pa11y --runner axe --runner htmlcs --standard WCAG2AAA http://localhost:3000`.

To adjust warning levels, ignore certain types of warnings, or create actions (such as button clicks or user login) that happens in test runs reference the [pa11y configuration docs]((https://github.com/pa11y/pa11y#configuration).

### Todo:

-   GraphQL
-   Apollo Server
-   GraphQL Code Generator
-   Typescript
-   Jest?
-   node?
