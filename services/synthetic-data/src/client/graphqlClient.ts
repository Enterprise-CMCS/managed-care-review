import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { Kind, print } from 'graphql'
import {
    defaultHttpRetryConfig,
    fetchWithRetry,
    type Fetch,
    type HttpRetryConfig,
} from './http'

export type GraphQLResponseError = {
    message: string
    path?: ReadonlyArray<string | number>
    extensions?: Record<string, unknown>
}

export class GraphQLRequestError extends Error {
    readonly status: number
    readonly errors: ReadonlyArray<GraphQLResponseError>

    constructor(
        message: string,
        status: number,
        errors: ReadonlyArray<GraphQLResponseError> = []
    ) {
        super(message)
        this.name = 'GraphQLRequestError'
        this.status = status
        this.errors = errors
    }
}

type AccessTokenProvider = () => string | Promise<string>

type GraphQLClientOptions = {
    endpoint: string
    accessToken: AccessTokenProvider
    fetch?: Fetch
    retry?: HttpRetryConfig
}

type GraphQLPayload<TResult> = {
    data?: TResult
    errors?: ReadonlyArray<GraphQLResponseError>
}

export class GraphQLClient {
    readonly #endpoint: string
    readonly #accessToken: AccessTokenProvider
    readonly #fetch: Fetch
    readonly #retry: HttpRetryConfig

    constructor(options: GraphQLClientOptions) {
        this.#endpoint = options.endpoint
        this.#accessToken = options.accessToken
        this.#fetch = options.fetch ?? fetch
        this.#retry = options.retry ?? defaultHttpRetryConfig
    }

    async execute<TResult, TVariables>(
        document: TypedDocumentNode<TResult, TVariables>,
        variables: TVariables
    ): Promise<TResult> {
        const operationDefinition = document.definitions.find(
            (definition) => definition.kind === Kind.OPERATION_DEFINITION
        )
        const operationName =
            operationDefinition?.kind === Kind.OPERATION_DEFINITION
                ? operationDefinition.name?.value
                : undefined
        const token = await this.#accessToken()
        const response = await fetchWithRetry(
            this.#fetch,
            this.#endpoint,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: print(document),
                    variables,
                    operationName,
                }),
            },
            this.#retry
        )

        let payload: GraphQLPayload<TResult>
        try {
            payload = (await response.json()) as GraphQLPayload<TResult>
        } catch {
            throw new GraphQLRequestError(
                `GraphQL endpoint returned invalid JSON with status ${response.status}`,
                response.status
            )
        }

        if (!response.ok) {
            throw new GraphQLRequestError(
                `GraphQL request failed with status ${response.status}`,
                response.status,
                payload.errors
            )
        }

        if (payload.errors && payload.errors.length > 0) {
            throw new GraphQLRequestError(
                `GraphQL operation ${operationName ?? 'anonymous'} returned errors`,
                response.status,
                payload.errors
            )
        }

        if (payload.data === undefined) {
            throw new GraphQLRequestError(
                `GraphQL operation ${operationName ?? 'anonymous'} returned no data`,
                response.status
            )
        }

        return payload.data
    }
}
