import { retry } from '../execution/retry'

export type Fetch = (
    input: string | URL | Request,
    init?: RequestInit
) => Promise<Response>

export type HttpRetryConfig = {
    maxAttempts: number
    baseDelayMs: number
    sleep?: (milliseconds: number) => Promise<void>
}

export const defaultHttpRetryConfig: HttpRetryConfig = {
    maxAttempts: 4,
    baseDelayMs: 250,
}

export async function fetchWithRetry(
    fetchImplementation: Fetch,
    input: string | URL | Request,
    init: RequestInit,
    config: HttpRetryConfig = defaultHttpRetryConfig
): Promise<Response> {
    return retry(
        async () => fetchImplementation(input, init),
        {
            ...config,
            shouldRetry: (error, response) =>
                error !== undefined ||
                response?.status === 429 ||
                (response !== undefined && response.status >= 500),
        }
    )
}
