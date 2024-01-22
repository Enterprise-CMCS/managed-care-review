import type { APIKeyType } from '../domain-models'
import { curry } from 'purify-ts/Function'
import { sign, verify } from 'jsonwebtoken'

interface JWTConfig {
    issuer: string
    signingKey: string
    expirationDurationS: number
}

function createValidJWT(config: JWTConfig, userID: string): APIKeyType {
    const token = sign({}, config.signingKey, {
        subject: userID,
        issuer: config.issuer,
        expiresIn: config.expirationDurationS,
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
        createValidJWT: curry(createValidJWT)(config),
        userIDFromToken: curry(userIDFromToken)(config),
    }
}

export type { JWTLib }

export { newJWTLib }
