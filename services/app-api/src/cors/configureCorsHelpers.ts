import type { APIGatewayProxyEvent } from 'aws-lambda'
import { logError } from '../logger'

// Helper function to check if origin matches allowed patterns
export const isOriginAllowed = (
    requestOrigin: string,
    allowedOrigins: string[]
) => {
    if (allowedOrigins.length === 0) return false

    return allowedOrigins.some((allowed) => {
        // If it starts with '*.', treat as domain wildcard
        if (allowed.startsWith('*.')) {
            const domain = allowed.substring(2) // Remove the '*.'
            return (
                requestOrigin.endsWith('.' + domain) || requestOrigin === domain
            )
        }
        // Otherwise, exact match
        return requestOrigin === allowed
    })
}

// Checks request origin against allowed origins and configures cors headers.
export const configureCorsHeaders = (
    response: any,
    event: APIGatewayProxyEvent
): void => {
    if (response && typeof response === 'object' && 'headers' in response) {
        const requestOrigin = event.headers?.origin || event.headers?.Origin

        if (!requestOrigin) {
            const msg = 'Cors configuration error. Request origin is undefined.'
            logError('configureCorsHeaders', msg)
            return
        }

        if (!process.env.APPLICATION_ENDPOINT) {
            const msg =
                'Cors configuration error. APPLICATION_ENDPOINT environment variable is undefined.'
            logError('configureCorsHeaders', msg)
            return
        }

        const allowedOrigins = [
            process.env.APPLICATION_ENDPOINT,
            ...(process.env.INTERNAL_ALLOWED_ORIGINS?.split(',')
                .filter(Boolean)
                .map((origin) => origin.trim()) || []),
        ]

        // Return no cors headers if origin is not allowed.
        if (!isOriginAllowed(requestOrigin, allowedOrigins)) {
            const msg = `Cors configuration error. Request origin ${requestOrigin} not allowed. Allowed Origins: ${allowedOrigins}`
            logError('configureCorsHeaders', msg)
            return
        }

        console.info('Cors Configuration:', {
            requestOrigin,
            allowedOrigins,
        })

        response.headers = {
            ...response.headers,
            'Access-Control-Allow-Origin': requestOrigin,
            'Access-Control-Allow-Headers':
                'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
        }
    }
}
