import { curry } from 'purify-ts/Function'
import { sign, verify } from 'jsonwebtoken'

interface JWTConfig {
    issuer: string
    signingKey: Buffer
    expirationDurationS: number
}

interface APIKeyType {
    key: string
    expiresAt: Date
}

interface OAuthTokenPayload {
    sub: string
    issuer: string
    client_id: string
    grant_type: string
    user_id: string
    grants: string[]
    iat: number
    exp: number
}

interface OauthTokenValidation {
    clientId: string
    issuer: string
    grantType: string
    userId: string
    grants: string[]
}

function createOAuthJWT(
    config: JWTConfig,
    clientId: string,
    grantType: string,
    userId: string,
    grants: string[]
): APIKeyType {
    const payload: OAuthTokenPayload = {
        sub: clientId,
        issuer: config.issuer,
        client_id: clientId,
        grant_type: grantType,
        user_id: userId,
        grants: grants,
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
): OauthTokenValidation | Error {
    try {
        const decoded = verify(token, config.signingKey, {
            issuer: config.issuer,
            algorithms: ['HS256'],
        }) as OAuthTokenPayload

        if (
            !decoded.client_id ||
            !decoded.issuer ||
            !decoded.grant_type ||
            !decoded.user_id ||
            !decoded.grants
        ) {
            return new Error('Missing required OAuth claims')
        }

        return {
            clientId: decoded.client_id,
            issuer: decoded.issuer,
            grantType: decoded.grant_type,
            userId: decoded.user_id,
            grants: decoded.grants,
        }
    } catch (err) {
        console.error('Error decoding OAuth JWT', err)
        return err
    }
}

export interface JWTLib {
    createOAuthJWT(
        clientId: string,
        grantType: string,
        userId: string,
        grants: string[]
    ): APIKeyType
    userIDFromToken(token: string): string | Error
    validateOAuthToken(token: string):
        | {
              clientId: string
              issuer: string
              grantType: string
              userId: string
              grants: string[]
          }
        | Error
}

export function newJWTLib(config: JWTConfig): JWTLib {
    return {
        createOAuthJWT: curry(createOAuthJWT)(config),
        userIDFromToken: curry(userIDFromToken)(config),
        validateOAuthToken: curry(validateOAuthToken)(config),
    }
}
