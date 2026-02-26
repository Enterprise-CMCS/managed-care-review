import { newJWTLib } from './jwt'

describe('jwtLib', () => {
    const config = {
        issuer: 'mcreview-test',
        signingKey: Buffer.from('123af', 'hex'),
        expirationDurationS: 1000,
    }

    it('works symmetricly', () => {
        const jwt = newJWTLib(config)

        const userID = 'bar'
        const clientId = 'test-client'
        const grantType = 'client_credentials'
        const grants = ['read', 'write']

        const token = jwt.createOAuthJWT(clientId, grantType, userID, grants)

        const higherDate = new Date(Date.now() + 1005 * 1000)
        const lowerDate = new Date(Date.now() + 995 * 1000)

        const decodedID = jwt.userIDFromToken(token.key)

        expect(decodedID).toBe(clientId)

        expect(token.expiresAt.getTime()).toBeLessThan(higherDate.getTime())
        expect(token.expiresAt.getTime()).toBeGreaterThan(lowerDate.getTime())
    })

    describe('OAuth tokens', () => {
        it('creates and validates OAuth tokens', () => {
            const jwt = newJWTLib(config)
            const clientId = 'test-client'
            const issuer = 'mcreview-test'
            const grantType = 'client_credentials'
            const userId = 'test-user-id'
            const grants = ['read', 'write']

            const token = jwt.createOAuthJWT(
                clientId,
                grantType,
                userId,
                grants
            )
            const result = jwt.validateOAuthToken(token.key)

            expect(result).not.toBeInstanceOf(Error)
            const validatedToken = result as {
                clientId: string
                issuer: string
                grantType: string
                userId: string
                grants: string[]
            }
            expect(validatedToken.clientId).toBe(clientId)
            expect(validatedToken.issuer).toBe(issuer)
            expect(validatedToken.grantType).toBe(grantType)
            expect(validatedToken.userId).toBe(userId)
            expect(validatedToken.grants).toEqual(grants)
        })

        it('fails validation for standard tokens', () => {
            const jwt = newJWTLib(config)
            const userID = 'bar'
            const clientId = 'test-client'
            const grantType = 'client_credentials'
            const grants = ['read', 'write']

            const token = jwt.createOAuthJWT(
                clientId,
                grantType,
                userID,
                grants
            )
            const result = jwt.validateOAuthToken(token.key)

            expect(result).not.toBeInstanceOf(Error)
        })

        it('fails validation for invalid OAuth tokens', () => {
            const jwt = newJWTLib(config)
            const result = jwt.validateOAuthToken('invalid.token.here')

            expect(result).toBeInstanceOf(Error)
        })
    })

    // error cases
    it('errors with wrong issuer', () => {
        const jwtWriter = newJWTLib({
            issuer: 'wrong',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

        const userID = 'bar'
        const clientId = 'test-client'
        const grantType = 'client_credentials'
        const grants = ['read', 'write']

        const token = jwtWriter.createOAuthJWT(
            clientId,
            grantType,
            userID,
            grants
        )

        const decodedID = jwtReader.userIDFromToken(token.key)

        expect(decodedID).toBeInstanceOf(Error)
    })

    it('errors with bad expiration', () => {
        const jwtWriter = newJWTLib({
            issuer: 'mctest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 0,
        })

        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

        const userID = 'bar'
        const clientId = 'test-client'
        const grantType = 'client_credentials'
        const grants = ['read', 'write']

        const token = jwtWriter.createOAuthJWT(
            clientId,
            grantType,
            userID,
            grants
        )

        const decodedID = jwtReader.userIDFromToken(token.key)

        expect(decodedID).toBeInstanceOf(Error)
    })

    it('errors with bad secret', () => {
        const jwtWriter = newJWTLib({
            issuer: 'mctest',
            signingKey: Buffer.from('deadbeef', 'hex'),
            expirationDurationS: 1000,
        })

        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

        const userID = 'bar'
        const clientId = 'test-client'
        const grantType = 'client_credentials'
        const grants = ['read', 'write']

        const token = jwtWriter.createOAuthJWT(
            clientId,
            grantType,
            userID,
            grants
        )

        const decodedID = jwtReader.userIDFromToken(token.key)

        expect(decodedID).toBeInstanceOf(Error)
    })

    it('errors with bogus JWT', () => {
        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

        const decodedID = jwtReader.userIDFromToken('blerg')

        expect(decodedID).toBeInstanceOf(Error)
    })
})
