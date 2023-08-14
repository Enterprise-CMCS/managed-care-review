// Typescript needs to be made happy with raw-loader to load a static file at build time
// see where we load the graphql schema in our graphql handler
declare module '*.graphql' {
    import type { DocumentNode } from 'graphql'
    const Schema: DocumentNode

    export = Schema
}
