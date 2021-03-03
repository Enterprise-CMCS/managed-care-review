# GraphQL

This service holds the schema for graphql communication between app-web and app-api. It has the tool `graphql-codegen` installed which generates typescript types from the schema and queries. These types are used by both app-web and app-api to bind their communication together.

There is a build step in ./dev that both app-api and app-web are dependent on that calls gqlgen.

codegen.yml configures the code generation, code is generated into a gen/ package that is gitignored. no files there should ever be edited.

`yarn gqlgen` generates separate types for the client and the server. The client code includes the queries and it even validates that those queries match the schema.
