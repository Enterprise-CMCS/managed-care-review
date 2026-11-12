import { ApolloServer } from '@apollo/server'
import { parse } from 'graphql'
import type { Context } from '../handlers/apollo_gql'
import { executeGraphQLOperation } from './apolloV4ResponseHelper'
import { testCMSUser } from './userFactories'

const server = new ApolloServer<Context>({
    typeDefs: `
        type Query {
            userID: ID!
            clientID: ID
            echo(value: String!): String!
        }
    `,
    resolvers: {
        Query: {
            userID: (_parent, _args, context: Context) =>
                context.user?.id ?? 'anonymous',
            clientID: (_parent, _args, context: Context) =>
                context.oauthClient?.clientId ?? null,
            echo: (_parent, args: { value: string }) => args.value,
        },
    },
})
const query = parse('{ userID clientID }')

beforeEach(() => vi.restoreAllMocks())
afterAll(() => server.stop())

describe('executeGraphQLOperation', () => {
    it('executes a document with variables and a typed user context', async () => {
        const context: Context = { user: testCMSUser({ id: 'cms-user' }) }
        const result = await executeGraphQLOperation<
            { userID: string; echo: string },
            { value: string }
        >(server, {
            query: parse(
                'query Echo($value: String!) { userID echo(value: $value) }'
            ),
            variables: { value: 'hello' },
            contextValue: context,
        })
        expect(result.errors).toBeUndefined()
        expect(result.data).toEqual({ userID: 'cms-user', echo: 'hello' })
    })

    it('forwards the exact OAuth/delegated context object', async () => {
        const context: Context = {
            user: testCMSUser({ id: 'delegated-user' }),
            oauthClient: {
                clientId: 'test-client',
                iss: 'test-issuer',
                grants: ['client_credentials'],
                scopes: [],
                isDelegatedUser: true,
            },
        }
        const execute = vi.spyOn(server, 'executeOperation')
        const result = await executeGraphQLOperation(server, {
            query,
            contextValue: context,
        })
        expect(execute.mock.calls[0][1]?.contextValue).toBe(context)
        expect(result.errors).toBeUndefined()
        expect(result.data).toEqual({
            userID: 'delegated-user',
            clientID: 'test-client',
        })
    })

    it.each([
        { name: 'omitted', options: {} },
        { name: 'explicitly undefined', options: { contextValue: undefined } },
    ])(
        'preserves the one-argument Apollo call when context is $name',
        async ({ options }) => {
            const execute = vi.spyOn(server, 'executeOperation')
            const result = await executeGraphQLOperation(server, {
                query,
                ...options,
            })
            expect(execute).toHaveBeenCalledTimes(1)
            expect(execute).toHaveBeenCalledWith({
                query,
                variables: undefined,
            })
            expect(result.errors).toBeUndefined()
            expect(result.data).toEqual({ userID: 'anonymous', clientID: null })
        }
    )

    it('preserves server-wrapper default injection and explicit context overrides', async () => {
        // Mirror constructTestPostgresServer's context injection without a database.
        const defaultContext: Context = {
            user: testCMSUser({ id: 'default-user' }),
        }
        const originalExecute = server.executeOperation.bind(server)
        vi.spyOn(server, 'executeOperation').mockImplementation(
            (request, options = {}) => {
                if (!options.contextValue) options.contextValue = defaultContext
                return originalExecute(request, options)
            }
        )
        const defaultResult = await executeGraphQLOperation(server, { query })
        const overrideResult = await executeGraphQLOperation(server, {
            query,
            contextValue: { user: testCMSUser({ id: 'override-user' }) },
        })
        expect(defaultResult.errors).toBeUndefined()
        expect(defaultResult.data?.userID).toBe('default-user')
        expect(overrideResult.errors).toBeUndefined()
        expect(overrideResult.data?.userID).toBe('override-user')
    })

    it('accepts string operations', async () => {
        const result = await executeGraphQLOperation(server, {
            query: '{ userID }',
            contextValue: { user: testCMSUser({ id: 'string-query-user' }) },
        })
        expect(result.errors).toBeUndefined()
        expect(result.data?.userID).toBe('string-query-user')
    })

    it('forwards an explicit empty context for a server that accepts it', async () => {
        const emptyContextServer = new ApolloServer({
            typeDefs: 'type Query { echo: String! }',
            resolvers: { Query: { echo: () => 'ok' } },
        })
        try {
            const execute = vi.spyOn(emptyContextServer, 'executeOperation')
            const result = await executeGraphQLOperation(emptyContextServer, {
                query: '{ echo }',
                contextValue: {},
            })
            expect(execute.mock.calls[0][1]?.contextValue).toEqual({})
            expect(result.errors).toBeUndefined()
            expect(result.data?.echo).toBe('ok')
        } finally {
            await emptyContextServer.stop()
        }
    })

    it('returns GraphQL errors rather than throwing on an invalid operation', async () => {
        const result = await executeGraphQLOperation(server, {
            query: '{ unknownField }',
        })
        expect(result.data).toBeUndefined()
        expect(result.errors).toHaveLength(1)
        expect(result.errors?.[0].extensions?.code).toBe(
            'GRAPHQL_VALIDATION_FAILED'
        )
    })
})
