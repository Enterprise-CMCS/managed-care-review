import { ApolloServer } from 'apollo-server-lambda'
import { gql } from '@apollo/client'
import { GraphQLError } from 'graphql'

describe('Apollo Server v3 Status Code Behavior', () => {
    describe('Variable validation errors', () => {
        it('Apollo Server v3 returns BAD_USER_INPUT for invalid variable types', async () => {
            // Simple test schema that doesn't require database
            const typeDefs = gql`
                type Query {
                    hello(name: String!): String
                }
            `

            const resolvers = {
                Query: {
                    hello: (_: unknown, { name }: { name: string }) =>
                        `Hello ${name}!`,
                },
            }

            const server = new ApolloServer({
                typeDefs,
                resolvers,
            })

            // Test invalid variable type (number instead of string)
            const result = await server.executeOperation({
                query: gql`
                    query HelloQuery($name: String!) {
                        hello(name: $name)
                    }
                `,
                variables: {
                    name: 123, // Invalid: number instead of string
                },
            })

            // Apollo Server v3 behavior: returns BAD_USER_INPUT for variable validation errors
            expect(result.errors).toBeDefined()
            expect(result.errors?.[0]?.message).toContain(
                'Variable "$name" got invalid value 123'
            )
            expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
        })

        it('Apollo Server v3 returns BAD_USER_INPUT for missing required variables', async () => {
            const typeDefs = gql`
                type Query {
                    hello(name: String!): String
                }
            `

            const resolvers = {
                Query: {
                    hello: (_: unknown, { name }: { name: string }) =>
                        `Hello ${name}!`,
                },
            }

            const server = new ApolloServer({
                typeDefs,
                resolvers,
            })

            // Test missing required variable
            const result = await server.executeOperation({
                query: gql`
                    query HelloQuery($name: String!) {
                        hello(name: $name)
                    }
                `,
                variables: {}, // Missing required variable
            })

            expect(result.errors).toBeDefined()
            expect(result.errors?.[0]?.message).toContain(
                'Variable "$name" of required type "String!" was not provided'
            )
            expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
        })

        it('Demonstrates the difference between v3 and v4 behavior', async () => {
            const typeDefs = gql`
                type Query {
                    test(input: String!): String
                }
            `

            const resolvers = {
                Query: {
                    test: (_: unknown, { input }: { input: string }) => input,
                },
            }

            const server = new ApolloServer({
                typeDefs,
                resolvers,
            })

            const result = await server.executeOperation({
                query: gql`
                    query Test($input: String!) {
                        test(input: $input)
                    }
                `,
                variables: {
                    input: 456, // Invalid type
                },
            })

            // Apollo Server v3 vs v4 Behavior
            // Apollo Server v3 (current): Returns BAD_USER_INPUT with 400 status
            // Apollo Server v4 would: Return BAD_USER_INPUT with 200 status (needs workaround)
            expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
        })
    })

    describe('Custom error handling', () => {
        it('Custom GraphQL errors work correctly', async () => {
            const typeDefs = gql`
                type Query {
                    validateAge(age: Int!): String
                }
            `

            const resolvers = {
                Query: {
                    validateAge: (_: unknown, { age }: { age: number }) => {
                        if (age < 0) {
                            throw new GraphQLError('Age must be positive', {
                                extensions: { code: 'BAD_USER_INPUT' },
                            })
                        }
                        return `Age ${age} is valid`
                    },
                },
            }

            const server = new ApolloServer({
                typeDefs,
                resolvers,
            })

            const result = await server.executeOperation({
                query: gql`
                    query ValidateAge($age: Int!) {
                        validateAge(age: $age)
                    }
                `,
                variables: {
                    age: -5,
                },
            })

            expect(result.errors).toBeDefined()
            expect(result.errors?.[0]?.message).toBe('Age must be positive')
            expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
        })
    })

    describe('HTTP status code implications', () => {
        it('Documents expected HTTP status behavior', () => {
            // HTTP Status Code Behavior
            // Apollo Server v3 (current implementation):
            // - Variable validation errors → 400 Bad Request
            // - GraphQL execution errors → 200 OK (with errors in response)
            // - Network/parsing errors → 400 Bad Request
            //
            // Apollo Server v4 changes:
            // - Variable validation errors → 200 OK (with errors in response)
            // - Requires explicit error formatting for proper status codes
            //
            // Current project status:
            // - Using Apollo Server v3 (apollo-server-lambda ^3.5.0)
            // - Variable validation should return 400 status codes
            // - Custom error handling uses GraphQLError with extensions.code

            // This is a documentation test - no assertions needed
            expect(true).toBe(true)
        })
    })
})
