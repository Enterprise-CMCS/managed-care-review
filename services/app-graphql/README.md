# app-graphql

This service holds the schema for GraphQL communication between [`app-web`](../app-web) and [`app-api`](../app-web). It is a dependency to run either of those services successfully.

## Significant dependencies

-   [GraphQL Code Generator](https://www.graphql-code-generator.com/docs/getting-started/index)
-   [GraphQL](https://graphql.org/learn/queries/)

## Useful scripts

### gqlgen

Generates typescript types from the GraphQL schema and queries. These types are referenced by both app-web and app-api to bind their communication together

## Organization and important files

-   `codegen.yml` configures code generation into a `gen/package` that is gitignored. _No files in this folder should be edited._
-   `src/queries` and `src/mutations` contain files in the [GraphQL query language](https://graphql.org/learn/queries/).
-   `src/fragments` directory contains common block of fields as [fragments](https://graphql.org/learn/queries/#fragments). They can be reused in `queries` and `mutations`.
-   The repo root level [`./dev`](../../dev) script has calls to `gqlgen` in both app-api and app-web.
