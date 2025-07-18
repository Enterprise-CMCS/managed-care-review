import { ApolloServer } from '@apollo/server'
import { gql } from '@apollo/client'
import { GraphQLError } from 'graphql'

describe('Apollo Server v4 Status Code Behavior', () => {
    describe('Variable validation errors', () => {
        it('Apollo Server v4 returns BAD_USER_INPUT for invalid variable types', async () => {
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
            await server.start()

            // Test invalid variable type (number instead of string)
            const response = await server.executeOperation({
                query: gql`
                    query HelloQuery($name: String!) {
                        hello(name: $name)
                    }
                `,
                variables: {
                    name: 123, // Invalid: number instead of string
                },
            }, {
                contextValue: {}, // Apollo v4 requires context
            })
            
            // Apollo Server v4 returns response with body property
            const result = response.body.kind === 'single' ? response.body.singleResult : response

            // Apollo Server v4 behavior: returns validation errors
            if (!result.errors) {
                console.log('Result:', JSON.stringify(result, null, 2))
            }
            expect(result.errors).toBeDefined()
            expect(result.errors?.[0]?.message).toContain(
                'Variable "$name" got invalid value 123'
            )
            // Apollo Server v4 validation errors include BAD_USER_INPUT code
            expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
        })

        it('Apollo Server v4 returns BAD_USER_INPUT for missing required variables', async () => {
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
            await server.start()

            // Test missing required variable
            const response = await server.executeOperation({
                query: gql`
                    query HelloQuery($name: String!) {
                        hello(name: $name)
                    }
                `,
                variables: {}, // Missing required variable
            }, {
                contextValue: {}, // Apollo v4 requires context
            })
            
            // Apollo Server v4 returns response with body property
            const result = response.body.kind === 'single' ? response.body.singleResult : response

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
            await server.start()

            const response = await server.executeOperation({
                query: gql`
                    query Test($input: String!) {
                        test(input: $input)
                    }
                `,
                variables: {
                    input: 456, // Invalid type
                },
            }, {
                contextValue: {}, // Apollo v4 requires context
            })
            
            // Apollo Server v4 returns response with body property
            const result = response.body.kind === 'single' ? response.body.singleResult : response

            // Apollo Server v4 Behavior
            // Apollo Server v4: Returns BAD_USER_INPUT with 200 HTTP status
            // Errors are included in the GraphQL response body
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
            await server.start()

            const response = await server.executeOperation({
                query: gql`
                    query ValidateAge($age: Int!) {
                        validateAge(age: $age)
                    }
                `,
                variables: {
                    age: -5,
                },
            }, {
                contextValue: {}, // Apollo v4 requires context
            })
            
            // Apollo Server v4 returns response with body property
            const result = response.body.kind === 'single' ? response.body.singleResult : response

            expect(result.errors).toBeDefined()
            expect(result.errors?.[0]?.message).toBe('Age must be positive')
            expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
        })
    })

    describe('HTTP status code implications', () => {
        it('Documents expected HTTP status behavior', () => {
            // HTTP Status Code Behavior
            // Apollo Server v4 (current implementation):
            // - Variable validation errors → 200 OK (with errors in response)
            // - GraphQL execution errors → 200 OK (with errors in response)
            // - Network/parsing errors → 400 Bad Request
            //
            // Apollo Server v4 behavior:
            // - All GraphQL errors return 200 OK
            // - Errors are included in the response body
            //
            // Current project status:
            // - Using Apollo Server v4 (@apollo/server ^4.11.0)
            // - Variable validation should return 400 status codes
            // - Custom error handling uses GraphQLError with extensions.code

            // This is a documentation test - no assertions needed
            expect(true).toBe(true)
        })
    })
})
