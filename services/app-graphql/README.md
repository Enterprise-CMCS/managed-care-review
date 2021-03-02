# GraphQL

We have added a build step that both app-api and app-web are depndent on, which is generating grapqhl code.

codegen.yml configures the code generation

`yarn gqlgen` generates separate types for the client and the server. The client code includes the queries and it even validates that those queries match the schema.

`yarn gqlgen` is run by ./dev
