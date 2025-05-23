import type { APIKeyType } from '../domain-models'
import { curry } from 'purify-ts/Function'
import { sign, verify } from 'jsonwebtoken'

interface JWTConfig {
    issuer: string
    signingKey: Buffer
    expirationDurationS: number
}

interface OAuthTokenPayload {
    sub: string
    client_id: string
    grant_type: string
    iat: number
    exp: number
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

function createOAuthJWT(
    config: JWTConfig,
    clientId: string,
    grantType: string
): APIKeyType {
    const payload: OAuthTokenPayload = {
        sub: clientId,
        client_id: clientId,
        grant_type: grantType,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + config.expirationDurationS,
    }

    const token = sign(payload, config.signingKey, {
        issuer: config.issuer,
        algorithm: 'HS256',
    })

    return {
        key: token,
        expiresAt: new Date(Date.now() + config.expirationDurationS * 1000),
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

function validateOAuthToken(
    config: JWTConfig,
    token: string
): { clientId: string; grantType: string } | Error {
    try {
        const decoded = verify(token, config.signingKey, {
            issuer: config.issuer,
            algorithms: ['HS256'],
        }) as OAuthTokenPayload

        if (!decoded.client_id || !decoded.grant_type) {
            return new Error('Missing required OAuth claims')
        }

        return {
            clientId: decoded.client_id,
            grantType: decoded.grant_type,
        }
    } catch (err) {
        console.info('Error decoding OAuth JWT', err)
        return err
    }
}

interface JWTLib {
    createValidJWT(userID: string): APIKeyType
    createOAuthJWT(clientId: string, grantType: string): APIKeyType
    userIDFromToken(token: string): string | Error
    validateOAuthToken(
        token: string
    ): { clientId: string; grantType: string } | Error
}

export function newJWTLib(config: JWTConfig): JWTLib {
    return {
        createValidJWT: curry(createValidJWT)(config),
        createOAuthJWT: curry(createOAuthJWT)(config),
        userIDFromToken: curry(userIDFromToken)(config),
        validateOAuthToken: curry(validateOAuthToken)(config),
    }
}
