import {
    defaultHttpRetryConfig,
    fetchWithRetry,
    type Fetch,
    type HttpRetryConfig,
} from './http'

export type OAuthToken = {
    accessToken: string
    tokenType: string
    expiresInSeconds?: number
}

export class OAuthTokenRequestError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'OAuthTokenRequestError'
        this.status = status
    }
}

type OAuthClientOptions = {
    tokenEndpoint: string
    clientId: string
    clientSecret: string
    fetch?: Fetch
    retry?: HttpRetryConfig
}

export class OAuthClient {
    readonly #tokenEndpoint: string
    readonly #clientId: string
    readonly #clientSecret: string
    readonly #fetch: Fetch
    readonly #retry: HttpRetryConfig

    constructor(options: OAuthClientOptions) {
        this.#tokenEndpoint = options.tokenEndpoint
        this.#clientId = options.clientId
        this.#clientSecret = options.clientSecret
        this.#fetch = options.fetch ?? fetch
        this.#retry = options.retry ?? defaultHttpRetryConfig
    }

    async requestToken(): Promise<OAuthToken> {
        const response = await fetchWithRetry(
            this.#fetch,
            this.#tokenEndpoint,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.#clientId,
                    client_secret: this.#clientSecret,
                }),
            },
            this.#retry
        )

        let payload: unknown
        try {
            payload = await response.json()
        } catch {
            throw new OAuthTokenRequestError(
                `OAuth token endpoint returned invalid JSON with status ${response.status}`,
                response.status
            )
        }

        if (!response.ok) {
            const errorCode =
                typeof payload === 'object' &&
                payload !== null &&
                'error' in payload &&
                typeof payload.error === 'string'
                    ? payload.error
                    : 'unknown_error'
            throw new OAuthTokenRequestError(
                `OAuth token request failed with status ${response.status}: ${errorCode}`,
                response.status
            )
        }

        if (
            typeof payload !== 'object' ||
            payload === null ||
            !('access_token' in payload) ||
            typeof payload.access_token !== 'string' ||
            payload.access_token.length === 0
        ) {
            throw new OAuthTokenRequestError(
                'OAuth token response did not contain an access_token',
                response.status
            )
        }

        const tokenType =
            'token_type' in payload && typeof payload.token_type === 'string'
                ? payload.token_type
                : 'Bearer'
        const expiresInSeconds =
            'expires_in' in payload && typeof payload.expires_in === 'number'
                ? payload.expires_in
                : undefined

        return {
            accessToken: payload.access_token,
            tokenType,
            expiresInSeconds,
        }
    }
}
