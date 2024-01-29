import type { APIKeyType } from '../domain-models'
import { curry } from 'purify-ts/Function'
import { sign, verify } from 'jsonwebtoken'

interface JWTConfig {
    issuer: string
    signingKey: Buffer
    expirationDurationS: number
}

function createValidJWT(config: JWTConfig, userID: string): APIKeyType {
    const token = sign({}, config.signingKey, {
        subject: userID,
        issuer: config.issuer,
        expiresIn: config.expirationDurationS,
        algorithm: 'HS256', // pin the default algo
    })

    return {
        key: token,
        expiresAt: new Date(Date.now() + config.expirationDurationS),
    }
}

function userIDFromToken(config: JWTConfig, token: string): string | Error {
    try {
        const decoded = verify(token, config.signingKey, {
            issuer: config.issuer,
            algorithms: ['HS256'], // pin the default algo
        })

        if (!decoded.sub || typeof decoded === 'string') {
            return new Error('No subject included in otherwise valid JWT')
        }

        return decoded.sub
    } catch (err) {
        console.info('Error decoding JWT', err)
        return err
    }
}

interface JWTLib {
    createValidJWT(userID: string): APIKeyType
    userIDFromToken(token: string): string | Error
}

function newJWTLib(config: JWTConfig): JWTLib {
    return {
        // this is an experiment, using `curry` here, It seems clean but I'm not sure
        // exactly what it's getting us yet -wml
        createValidJWT: curry(createValidJWT)(config),
        userIDFromToken: curry(userIDFromToken)(config),
    }
}

export type { JWTLib }

export { newJWTLib }
