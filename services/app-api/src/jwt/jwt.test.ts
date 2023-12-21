import { newJWTLib } from './jwt'

describe('jwtLib', () => {
    it('works symmetricly', () => {
        const jwt = newJWTLib({
            issuer: 'mctest',
            signingKey: 'foo', //pragma: allowlist secret
            expirationDurationS: 1000,
        })

        const userID = 'bar'

        const token = jwt.createValidJWT(userID)

        const decodedID = jwt.userIDFromToken(token.key)

        expect(decodedID).toBe(userID)

        const higherDate = new Date(Date.now() + 1005)
        const lowerDate = new Date(Date.now() + 995)

        expect(token.expiresAt.getTime()).toBeLessThan(higherDate.getTime())
        expect(token.expiresAt.getTime()).toBeGreaterThan(lowerDate.getTime())
    })

    // error cases
    it('errors with wrong issuer', () => {
        const jwtWriter = newJWTLib({
            issuer: 'wrong',
            signingKey: 'foo',
            expirationDurationS: 1000,
        })

        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: 'foo',
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
            signingKey: 'foo',
            expirationDurationS: 0,
        })

        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: 'foo',
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
            signingKey: 'wrong',
            expirationDurationS: 1000,
        })

        const jwtReader = newJWTLib({
            issuer: 'mctest',
            signingKey: 'foo',
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
            signingKey: 'foo',
            expirationDurationS: 1000,
        })

        const decodedID = jwtReader.userIDFromToken('blerg')

        expect(decodedID).toBeInstanceOf(Error)
    })
})
