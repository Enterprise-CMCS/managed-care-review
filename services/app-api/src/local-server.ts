/**
 * Local development server that replaces serverless-offline
 * Runs Lambda handlers directly in Node.js with Express
 */

import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import type {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda'

// Import handlers - all ESM now
import { gqlHandler } from './handlers/apollo_gql'
import { main as healthCheckHandler } from './handlers/health_check'
import { main as oauthTokenHandler } from './handlers/oauth_token'
import { main as otelProxyHandler } from './handlers/otel_proxy'
import { main as thirdPartyAuthorizer } from './handlers/third_party_API_authorizer'

const app = express()
const router = express.Router()

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS middleware for local development
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }
    next()
})

// Helper to convert Express request to Lambda APIGatewayProxyEvent
function toLambdaEvent(req: Request): APIGatewayProxyEvent {
    const headers: Record<string, string> = {}
    Object.keys(req.headers).forEach((key) => {
        const value = req.headers[key]
        if (typeof value === 'string') {
            headers[key] = value
        } else if (Array.isArray(value)) {
            headers[key] = value[0]
        }
    })

    // Extract auth info from headers (sent by web app in LOCAL mode)
    const cognitoAuthProvider =
        headers['cognito-authentication-provider'] || null

    // Determine body format based on content-type
    let body: string | null = null
    if (req.method !== 'GET' && req.body) {
        const contentType =
            headers['content-type'] || headers['Content-Type'] || ''
        if (contentType.includes('application/x-www-form-urlencoded')) {
            // Convert parsed object back to URL-encoded string for Lambda
            body = new URLSearchParams(
                req.body as Record<string, string>
            ).toString()
        } else {
            body = JSON.stringify(req.body)
        }
    }

    return {
        httpMethod: req.method,
        path: req.path,
        headers,
        multiValueHeaders: {},
        queryStringParameters: req.query as Record<string, string>,
        multiValueQueryStringParameters: null,
        pathParameters: req.params || null,
        stageVariables: null,
        body,
        isBase64Encoded: false,
        requestContext: {
            accountId: 'local',
            apiId: 'local',
            protocol: 'HTTP/1.1',
            httpMethod: req.method,
            path: req.path,
            stage: 'local',
            requestId: `local-${Date.now()}`,
            requestTime: new Date().toISOString(),
            requestTimeEpoch: Date.now(),
            identity: {
                sourceIp: req.ip || '',
                userAgent: req.get('user-agent') || '',
                cognitoIdentityPoolId: null,
                cognitoIdentityId: null,
                cognitoAuthenticationProvider: cognitoAuthProvider,
                cognitoAuthenticationType: null,
                accountId: null,
                caller: null,
                accessKey: null,
                user: null,
                userArn: null,
                principalOrgId: null,
                apiKey: null,
                apiKeyId: null,
                clientCert: null,
            },
            resourceId: 'local',
            resourcePath: req.path,
            authorizer: null,
        },
        resource: req.path,
    }
}

// Helper to convert Lambda response to Express response
async function handleLambdaResponse(
    res: Response,
    handlerPromise: Promise<APIGatewayProxyResult>
) {
    try {
        const response = await handlerPromise

        // Set headers
        if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
                if (value !== undefined) {
                    res.setHeader(key, value.toString())
                }
            })
        }

        // Set status and body
        res.status(response.statusCode)

        if (response.body) {
            // Try to parse and pretty-print JSON for better debugging
            try {
                const parsed = JSON.parse(response.body)
                res.json(parsed)
            } catch {
                res.send(response.body)
            }
        } else {
            res.end()
        }
    } catch (error) {
        console.error('Error handling Lambda response:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error),
        })
    }
}

// Minimal Lambda context for local development
const createContext = (): Context => ({
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'local',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:local',
    memoryLimitInMB: '1024',
    awsRequestId: `local-${Date.now()}`,
    logGroupName: '/aws/lambda/local',
    logStreamName: 'local',
    getRemainingTimeInMillis: () => 300000,
    done: (_error?: Error, _result?: any) => {},
    fail: (_error: Error | string) => {},
    succeed: (_messageOrObject: any) => {},
})

// Routes (all mounted under /local to match serverless-offline behavior)

// Health check
router.get('/health_check', async (req: Request, res: Response) => {
    const event = toLambdaEvent(req)
    const context = createContext()
    await handleLambdaResponse(
        res,
        healthCheckHandler(
            event,
            context,
            () => {}
        ) as Promise<APIGatewayProxyResult>
    )
})

// OAuth token
router.post('/oauth/token', async (req: Request, res: Response) => {
    const event = toLambdaEvent(req)
    await handleLambdaResponse(res, oauthTokenHandler(event))
})

// OTEL proxy
router.post('/otel', async (req: Request, res: Response) => {
    const event = toLambdaEvent(req)
    const context = createContext()
    await handleLambdaResponse(
        res,
        otelProxyHandler(
            event,
            context,
            () => {}
        ) as Promise<APIGatewayProxyResult>
    )
})

// GraphQL endpoints
router.all('/graphql', async (req: Request, res: Response) => {
    const event = toLambdaEvent(req)
    const context = createContext()
    await handleLambdaResponse(
        res,
        gqlHandler(event, context, () => {}) as Promise<APIGatewayProxyResult>
    )
})

// External GraphQL endpoints - simulates API Gateway with third_party_API_authorizer
// This mimics how API Gateway handles TOKEN authorizers in production
router.all('/v1/graphql/external', async (req: Request, res: Response) => {
    const event = toLambdaEvent(req)
    const context = createContext()

    // API Gateway returns 401 if no Authorization header is present for TOKEN authorizers
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
        // Build authorizer event matching API Gateway's TOKEN authorizer format
        const authorizerEvent = {
            authorizationToken: authHeader,
            methodArn: `arn:aws:execute-api:us-east-1:000000000000:local/local/${req.method}${req.path}`,
            type: 'TOKEN' as const,
        }

        const authResult = await thirdPartyAuthorizer(
            authorizerEvent,
            createContext(),
            () => {}
        )

        // API Gateway checks the policy - if Effect is Deny or principalId is empty, return 403
        const policyEffect = authResult?.policyDocument?.Statement?.[0]?.Effect
        if (!authResult || !authResult.principalId || policyEffect === 'Deny') {
            return res.status(403).json({ message: 'Forbidden' })
        }

        // Populate authorizer context exactly as API Gateway does
        // API Gateway flattens the authorizer response into requestContext.authorizer
        // All values become strings (API Gateway stringifies context values)
        event.requestContext.authorizer = {
            principalId: authResult.principalId,
            integrationLatency: 0,
            ...(authResult.context || {}),
        }
    } catch (error) {
        // API Gateway returns 401 for authorizer exceptions
        console.error('Authorization error:', error)
        return res.status(401).json({ message: 'Unauthorized' })
    }

    await handleLambdaResponse(
        res,
        gqlHandler(event, context, () => {}) as Promise<APIGatewayProxyResult>
    )
})

// Mount all routes under /local
app.use('/local', router)

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        availableRoutes: [
            'GET /local/health_check',
            'POST /local/oauth/token',
            'POST /local/otel',
            'GET|POST /local/graphql',
            'GET|POST /local/v1/graphql/external',
        ],
    })
})

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err)
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
    })
})

// Start server
const PORT = parseInt(process.env.PORT || '3030', 10)
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(
        `Invalid PORT: ${PORT}. Must be an integer between 1 and 65535.`
    )
}
const HOST = process.env.HOST || '127.0.0.1'

app.listen(PORT, HOST, () => {
    console.info(
        '╔════════════════════════════════════════════════════════════╗'
    )
    console.info(
        '║                                                            ║'
    )
    console.info(
        '║   🚀  Managed Care Review API Server (Local)              ║'
    )
    console.info(
        '║                                                            ║'
    )
    console.info(
        '╚════════════════════════════════════════════════════════════╝'
    )
    console.info('')
    console.info(`   Server:      http://${HOST}:${PORT}`)
    console.info(`   GraphQL:     http://${HOST}:${PORT}/local/graphql`)
    console.info(`   Health:      http://${HOST}:${PORT}/local/health_check`)
    console.info(`   Environment: ${process.env.VITE_APP_AUTH_MODE || 'LOCAL'}`)
    console.info('')
    console.info('   Press Ctrl+C to stop')
    console.info('')
})

// Graceful shutdown
process.on('SIGTERM', () => {
    console.info('\nShutting down gracefully...')
    process.exit(0)
})

process.on('SIGINT', () => {
    console.info('\nShutting down gracefully...')
    process.exit(0)
})
