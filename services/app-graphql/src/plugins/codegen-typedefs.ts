import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { GraphQLSchema, stripIgnoredCharacters } from 'graphql'

// https://github.com/dotansimha/graphql-code-generator/issues/3899
const print = (schema: string) => {
    const escapedSchema = schema.replace(/\\`/g, '\\\\`').replace(/`/g, '\\`')

    return (
        '\n' +
        'import { gql } from "@apollo/client/core"' +
        '\n' +
        'export const typeDefs = gql`' +
        escapedSchema +
        '`;'
    )
}

export const plugin = (schema: GraphQLSchema) =>
    print(stripIgnoredCharacters(printSchemaWithDirectives(schema)))
