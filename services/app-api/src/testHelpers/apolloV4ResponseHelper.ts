import type { DocumentNode, GraphQLFormattedError } from 'graphql'
import type { ApolloServer } from '@apollo/server'

export type TestGraphQLResponse<T = any> = {
    data?: T
    errors?: GraphQLFormattedError[]
}

// Helper to extract GraphQL response from Apollo v4 response structure
export function extractGraphQLResponse<T = any>(
    response: any
): TestGraphQLResponse<T> {
    // Handle Apollo v4 response structure
    if ('body' in response && response.body) {
        const result =
            response.body.kind === 'single'
                ? response.body.singleResult
                : response.body

        return {
            data: result.data,
            errors: result.errors,
        }
    }

    return {
        data: response.data,
        errors: response.errors,
    }
}

export async function executeGraphQLOperation<TData = any, TVariables = any>(
    server: ApolloServer,
    options: {
        query: DocumentNode
        variables?: TVariables
        contextValue?: any
    }
): Promise<TestGraphQLResponse<TData>> {
    const response = await server.executeOperation({
        query: options.query,
        variables: options.variables as any,
    })

    return extractGraphQLResponse<TData>(response)
}
