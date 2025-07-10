import { ApolloServer } from 'apollo-server-lambda'
import typeDefs from '../../../../app-graphql/src/schema.graphql'
import { configureResolvers } from '../../resolvers'
import { NewPostgresStore } from '../../postgres'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { newJWTLib } from '../../jwt'
import { newS3Client } from '../../s3'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { FetchHealthPlanPackageDocument } from '../../gen/gqlClient'

describe('Apollo Server Status Code Tests', () => {
    let server: ApolloServer
    
    beforeAll(async () => {
        // Use the test helper to create a properly configured server
        server = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })
    })
    
    it('should handle invalid variables object correctly', async () => {
        // Test 1: Invalid variables type (string instead of object)
        const invalidVariablesResult = await server.executeOperation({
            query: FetchHealthPlanPackageDocument,
            // @ts-expect-error Intentionally passing invalid type
            variables: "invalid variables string",
        })
        
        // Check if there are errors
        expect(invalidVariablesResult.errors).toBeDefined()
        expect(invalidVariablesResult.errors).toHaveLength(1)
        
        // Apollo Server v3 returns 400 for invalid variables
        // Apollo Server v4 returns 200 for invalid variables (unless workaround is applied)
        // Since we're still on v3, we expect the error to be present but executeOperation
        // doesn't expose HTTP status codes directly
        
        console.log('Error for invalid variables:', invalidVariablesResult.errors?.[0])
    })
    
    it('should handle missing required variables correctly', async () => {
        // Test 2: Missing required variables
        const missingVariablesResult = await server.executeOperation({
            query: FetchHealthPlanPackageDocument,
            variables: {}, // Missing required 'id' variable
        })
        
        expect(missingVariablesResult.errors).toBeDefined()
        expect(missingVariablesResult.errors).toHaveLength(1)
        expect(missingVariablesResult.errors?.[0].message).toContain('Variable')
        
        console.log('Error for missing variables:', missingVariablesResult.errors?.[0])
    })
    
    it('should handle malformed query correctly', async () => {
        // Test 3: Malformed query
        const malformedResult = await server.executeOperation({
            query: `query { invalidQuery }`,
            variables: {},
        })
        
        expect(malformedResult.errors).toBeDefined()
        console.log('Error for malformed query:', malformedResult.errors?.[0])
    })
})