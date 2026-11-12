import type { DocumentNode, GraphQLFormattedError } from 'graphql'
import type { ApolloServer, BaseContext } from '@apollo/server'

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

export async function executeGraphQLOperation<
    TData = any,
    TVariables = any,
    TContext extends BaseContext = any,
>(
    server: ApolloServer<TContext>,
    options: {
        query: DocumentNode | string
        variables?: TVariables
        contextValue?: TContext
    }
): Promise<TestGraphQLResponse<TData>> {
    const request = {
        query: options.query,
        variables: options.variables as any,
    }
    // Preserve default-context injection in server wrappers when no context is given.
    const response =
        options.contextValue === undefined
            ? await server.executeOperation(request)
            : await server.executeOperation(request, {
                  contextValue: options.contextValue,
              })

    return extractGraphQLResponse<TData>(response)
}
