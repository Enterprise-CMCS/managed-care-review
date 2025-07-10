import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { gqlHandler } from '../apollo_gql'

// Mock environment variables
process.env.VITE_APP_AUTH_MODE = 'LOCAL'
process.env.SECRETS_MANAGER_SECRET = 'test-secret'
process.env.DATABASE_URL = 'postgresql://test'
process.env.stage = 'test'
process.env.APPLICATION_ENDPOINT = 'http://localhost'
process.env.EMAILER_MODE = 'LOCAL'
process.env.API_APP_OTEL_COLLECTOR_URL = 'http://localhost:4318'
process.env.PARAMETER_STORE_MODE = 'LOCAL'
process.env.LD_SDK_KEY = 'test-key'
process.env.JWT_SECRET = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
process.env.VITE_APP_S3_DOCUMENTS_BUCKET = 'test-docs'
process.env.VITE_APP_S3_QA_BUCKET = 'test-qa'
process.env.REGION = 'us-east-1'

describe('Apollo Server HTTP Status Code Tests', () => {
    const mockContext: Context = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'test',
        functionVersion: '1',
        invokedFunctionArn: 'arn:test',
        memoryLimitInMB: '128',
        awsRequestId: 'test-request-id',
        logGroupName: 'test-log-group',
        logStreamName: 'test-log-stream',
        getRemainingTimeInMillis: () => 1000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
    }

    const createMockEvent = (body: any): APIGatewayProxyEvent => ({
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
        },
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/graphql',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: 'test',
            apiId: 'test',
            authorizer: {},
            protocol: 'HTTP/1.1',
            httpMethod: 'POST',
            path: '/graphql',
            stage: 'test',
            requestId: 'test-request-id',
            requestTime: '01/Jan/2023:00:00:00 +0000',
            requestTimeEpoch: 1234567890,
            resourceId: 'test',
            resourcePath: '/graphql',
            identity: {
                cognitoIdentityPoolId: null,
                accountId: null,
                cognitoIdentityId: null,
                caller: null,
                sourceIp: '127.0.0.1',
                principalOrgId: null,
                accessKey: null,
                cognitoAuthenticationType: null,
                cognitoAuthenticationProvider: 'CognitoIdp.email=testuser@example.com,USER_ID=test-user-id',
                userArn: null,
                userAgent: 'test-agent',
                user: null,
                apiKey: null,
                apiKeyId: null,
                clientCert: null,
            },
        },
        resource: '/graphql',
    })

    describe('Invalid Variables Handling', () => {
        it('should return appropriate status code for invalid variables type', async () => {
            const event = createMockEvent({
                query: `
                    query FetchHealthPlanPackage($id: ID!) {
                        fetchHealthPlanPackage(id: $id) {
                            id
                        }
                    }
                `,
                variables: "invalid string instead of object", // Invalid: should be an object
            })

            try {
                const response = await gqlHandler(event, mockContext, () => {})
                
                console.log('Response status for invalid variables type:', response?.statusCode)
                console.log('Response body:', response?.body)
                
                // In Apollo Server v3: This should return 400
                // In Apollo Server v4: This would return 200 (without workaround)
                expect(response?.statusCode).toBe(400)
                
                const body = JSON.parse(response?.body || '{}')
                expect(body.errors).toBeDefined()
            } catch (error) {
                console.error('Handler error:', error)
                throw error
            }
        })

        it('should return appropriate status code for malformed JSON', async () => {
            const event = createMockEvent('')
            event.body = '{ invalid json' // Malformed JSON
            
            try {
                const response = await gqlHandler(event, mockContext, () => {})
                
                console.log('Response status for malformed JSON:', response?.statusCode)
                console.log('Response body:', response?.body)
                
                // Both v3 and v4 should return 400 for malformed JSON
                expect(response?.statusCode).toBe(400)
            } catch (error) {
                console.error('Handler error:', error)
                throw error
            }
        })

        it('should return appropriate status code for missing required variables', async () => {
            const event = createMockEvent({
                query: `
                    query FetchHealthPlanPackage($id: ID!) {
                        fetchHealthPlanPackage(id: $id) {
                            id
                        }
                    }
                `,
                variables: {}, // Missing required 'id' variable
            })

            try {
                const response = await gqlHandler(event, mockContext, () => {})
                
                console.log('Response status for missing variables:', response?.statusCode)
                console.log('Response body:', response?.body)
                
                // In Apollo Server v3: This should return 400
                // In Apollo Server v4: This would return 200 (without workaround)
                expect(response?.statusCode).toBe(400)
                
                const body = JSON.parse(response?.body || '{}')
                expect(body.errors).toBeDefined()
                expect(body.errors[0].message).toContain('Variable')
            } catch (error) {
                console.error('Handler error:', error)
                throw error
            }
        })

        it('should return 200 for valid GraphQL errors (field errors)', async () => {
            const event = createMockEvent({
                query: `
                    query {
                        nonExistentField
                    }
                `,
            })

            try {
                const response = await gqlHandler(event, mockContext, () => {})
                
                console.log('Response status for field errors:', response?.statusCode)
                console.log('Response body:', response?.body)
                
                // Both v3 and v4 return 200 for field-level errors
                expect(response?.statusCode).toBe(200)
                
                const body = JSON.parse(response?.body || '{}')
                expect(body.errors).toBeDefined()
            } catch (error) {
                console.error('Handler error:', error)
                throw error
            }
        })
    })

    describe('Apollo v4 Status Code Changes', () => {
        it('documents the difference between v3 and v4', () => {
            console.log(`
Apollo Server Status Code Behavior:

Apollo Server v3 (current):
- Invalid variables type (string instead of object): 400 ✓
- Missing required variables: 400 ✓
- Malformed JSON: 400 ✓
- Field-level errors: 200 ✓

Apollo Server v4 (without workaround):
- Invalid variables type: 200 ✗ (should be 400)
- Missing required variables: 200 ✗ (should be 400)
- Malformed JSON: 400 ✓
- Field-level errors: 200 ✓

The key issue: Apollo v4 returns 200 for validation errors that should return 400.
This affects:
1. Invalid variable types
2. Missing required variables
3. Variable validation errors

Workaround needed: Custom error handling to set proper HTTP status codes.
            `)
        })
    })
})