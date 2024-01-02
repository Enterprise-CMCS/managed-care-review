import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import CREATE_API_KEY from '../../../../app-graphql/src/mutations/createAPIKey.graphql'
import { newJWTLib } from '../../jwt'
import { testCMSUser } from '../../testHelpers/userHelpers'

describe('createAPIKey', () => {
    it('creates a new API key', async () => {
        const jwt = newJWTLib({
            issuer: 'mctestiss',
            signingKey: 'foo',
            expirationDurationS: 1000,
        })

        const user = testCMSUser()

        const server = await constructTestPostgresServer({
            jwt,
            context: { user },
        })

        const result = await server.executeOperation({
            query: CREATE_API_KEY,
        })

        const keyResult = result.data?.createAPIKey

        const token = keyResult.key

        const userID = jwt.userIDFromToken(token)

        expect(userID).toBe(user.id)
    })
})
