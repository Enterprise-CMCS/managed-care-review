import { newJWTLib } from './jwt'

describe('jwtLib', () => {
    const config = {
        issuer: 'mctest',
        signingKey: Buffer.from('123af', 'hex'),
        expirationDurationS: 1000,
    }

    it('works symmetricly', () => {
        const jwt = newJWTLib(config)

        const userID = 'bar'

        const token = jwt.createValidJWT(userID)

        const higherDate = new Date(Date.now() + 1005)
        const lowerDate = new Date(Date.now() + 995)

        const decodedID = jwt.userIDFromToken(token.key)

        expect(decodedID).toBe(userID)

        expect(token.expiresAt.getTime()).toBeLessThan(higherDate.getTime())
        expect(token.expiresAt.getTime()).toBeGreaterThan(lowerDate.getTime())
    })

    describe('OAuth tokens', () => {
        it('creates and validates OAuth tokens', () => {
            const jwt = newJWTLib(config)
            const clientId = 'test-client'
            const grantType = 'client_credentials'

            const token = jwt.createOAuthJWT(clientId, grantType)
            const result = jwt.validateOAuthToken(token.key)

            expect(result).not.toBeInstanceOf(Error)
            const validatedToken = result as {
                clientId: string
                grantType: string
            }
            expect(validatedToken.clientId).toBe(clientId)
            expect(validatedToken.grantType).toBe(grantType)
        })

        it('fails validation for standard tokens', () => {
            const jwt = newJWTLib(config)
            const userID = 'bar'

            const token = jwt.createValidJWT(userID)
            const result = jwt.validateOAuthToken(token.key)

            expect(result).toBeInstanceOf(Error)
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

        const token = jwtWriter.createValidJWT(userID)

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

        const token = jwtWriter.createValidJWT(userID)

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

        const token = jwtWriter.createValidJWT(userID)

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
