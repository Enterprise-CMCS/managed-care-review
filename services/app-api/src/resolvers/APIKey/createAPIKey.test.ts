import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { CreateApiKeyDocument } from '../../gen/gqlClient'
import { newJWTLib } from '../../jwt'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'

describe('createAPIKey', () => {
    it('creates a new API key', async () => {
        const jwt = newJWTLib({
            issuer: 'mctestiss',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

        const user = testCMSUser()

        const server = await constructTestPostgresServer({
            jwt,
            context: { user },
        })

        const response = await server.executeOperation({
            query: CreateApiKeyDocument,
        }, {
            contextValue: { user },
        })
        const result = extractGraphQLResponse(response)

        const keyResult = result.data?.createAPIKey

        const token = keyResult?.key

        const userID = jwt.userIDFromToken(token)

        expect(userID).toBe(user.id)
    })
})
