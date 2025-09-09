import type { APIGatewayProxyEvent } from 'aws-lambda'

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
): void | Error => {
    if (response && typeof response === 'object' && 'headers' in response) {
        const requestOrigin = event.headers?.origin || event.headers?.Origin

        if (!requestOrigin) {
            console.error(
                'Cors configuration error. Request origin is undefined.'
            )
            console.info('Request data')
            console.info(event.headers)
            return
        }

        if (!process.env.APPLICATION_ENDPOINT) {
            console.error(
                'Cors configuration error. APPLICATION_ENDPOINT environment variable is undefined.'
            )
            return
        }

        const allowedOrigins = [
            process.env.APPLICATION_ENDPOINT,
            ...(process.env.INTERNAL_ALLOWED_ORIGINS?.split(',')
                .map((origin) => origin.trim())
                .filter(Boolean) || []),
        ]

        // Return no cors headers if origin is not allowed.
        if (!isOriginAllowed(requestOrigin, allowedOrigins)) {
            console.error(
                `Cors configuration error. Request origin ${requestOrigin} not allowed. Allowed Origins: ${allowedOrigins}`
            )
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
