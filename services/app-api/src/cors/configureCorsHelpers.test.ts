import { isOriginAllowed, configureCorsHeaders } from './configureCorsHelpers'
import type { APIGatewayProxyEvent } from 'aws-lambda'

describe('isOriginAllowed', () => {
    it.each([
        // Edge cases
        ['', ['https://example.com'], false, 'empty requestOrigin'],
        [undefined, ['https://example.com'], false, 'undefined requestOrigin'],
        ['https://example.com', [], false, 'empty allowedOrigins array'],
        ['', [], false, 'both empty requestOrigin and allowedOrigins'],

        // Exact matches
        [
            'https://example.com',
            ['https://example.com'],
            true,
            'exact URL match',
        ],
        [
            'someUrl123@mydomain.com',
            ['someUrl123@mydomain.com'],
            true,
            'exact email match',
        ],
        [
            'https://space.com',
            ['https://example.com'],
            false,
            'non-matching URLs',
        ],
        [
            'https://admin.com',
            ['https://app.com', 'https://admin.com', 'https://api.com'],
            true,
            'match one of multiple allowed origins',
        ],
        [
            'https://Example.com',
            ['https://example.com'],
            false,
            'case sensitive exact match',
        ],

        // Wildcard domain matches
        [
            'https://app.salesforce.com',
            ['*.salesforce.com'],
            true,
            'subdomain matching wildcard',
        ],
        [
            'salesforce.com',
            ['*.salesforce.com'],
            true,
            'root domain matching wildcard',
        ],
        [
            'https://test.app.salesforce.com',
            ['*.salesforce.com'],
            true,
            'nested subdomain matching wildcard',
        ],
        [
            'https://fakesalesforce.com',
            ['*.salesforce.com'],
            false,
            'partial domain match should fail',
        ],
        [
            'https://salesforce.com.space.com',
            ['*.salesforce.com'],
            false,
            'domain that contains but does not end with allowed domain',
        ],
        [
            'https://portal.cms.gov',
            ['*.cms.gov'],
            true,
            'government domain wildcard match',
        ],

        // Multiple wildcard patterns
        [
            'https://test.salesforce.com',
            ['*.salesforce.com', '*.cms.gov', 'https://exact.com'],
            true,
            'first wildcard in multiple patterns',
        ],
        [
            'https://app.cms.gov',
            ['*.salesforce.com', '*.cms.gov', 'https://exact.com'],
            true,
            'second wildcard in multiple patterns',
        ],
        [
            'https://exact.com',
            ['*.salesforce.com', '*.cms.gov', 'https://exact.com'],
            true,
            'exact match in multiple patterns',
        ],
        [
            'https://space.com',
            ['*.salesforce.com', '*.cms.gov', 'https://exact.com'],
            false,
            'no match in multiple patterns',
        ],

        // Mixed patterns (real-world scenario)
        [
            'someUrl123@mydomain.com',
            [
                'someUrl123@mydomain.com',
                '*.salesforce.com',
                '*.cms.gov',
                'https://exact-match.com',
            ],
            true,
            'email in mixed patterns',
        ],
        [
            'https://app.salesforce.com',
            [
                'someUrl123@mydomain.com',
                '*.salesforce.com',
                '*.cms.gov',
                'https://exact-match.com',
            ],
            true,
            'salesforce wildcard in mixed patterns',
        ],
        [
            'https://portal.cms.gov',
            [
                'someUrl123@mydomain.com',
                '*.salesforce.com',
                '*.cms.gov',
                'https://exact-match.com',
            ],
            true,
            'cms wildcard in mixed patterns',
        ],
        [
            'https://exact-match.com',
            [
                'someUrl123@mydomain.com',
                '*.salesforce.com',
                '*.cms.gov',
                'https://exact-match.com',
            ],
            true,
            'exact match in mixed patterns',
        ],
        [
            'https://not-allowed.com',
            [
                'someUrl123@mydomain.com',
                '*.salesforce.com',
                '*.cms.gov',
                'https://exact-match.com',
            ],
            false,
            'blocked origin in mixed patterns',
        ],

        // Protocol variations
        [
            'http://example.com',
            ['https://example.com'],
            false,
            'http vs https exact match',
        ],
        [
            'http://app.example.com',
            ['*.example.com'],
            true,
            'http with wildcard domain match',
        ],

        // Edge cases with wildcards
        ['https://test.com', ['*.'], false, 'wildcard with empty domain'],
        [
            'https://test.com',
            ['*test.com'],
            false,
            'malformed wildcard missing dot',
        ],
        ['https://a.b', ['*.b'], true, 'single character domains'],
    ])(
        'should return %s when requestOrigin=%s and allowedOrigins=%s (%s)',
        (requestOrigin, allowedOrigins, expected, description) => {
            const result = isOriginAllowed(requestOrigin as any, allowedOrigins)
            expect(result).toBe(expected)
        }
    )
})

describe('configureCorsHeaders', () => {
    const originalEnv = {
        APPLICATION_ENDPOINT: process.env.APPLICATION_ENDPOINT,
        INTERNAL_ALLOWED_ORIGINS: '',
    }

    // Spy on isOriginAllowed only within this describe block
    const mockIsOriginAllowed = vi.spyOn({ isOriginAllowed }, 'isOriginAllowed')

    beforeEach(() => {
        vi.clearAllMocks()
        process.env = { ...originalEnv }
    })

    afterAll(() => {
        process.env = originalEnv
        mockIsOriginAllowed.mockRestore()
    })

    const createMockEvent = (origin?: string): APIGatewayProxyEvent => ({
        headers: origin ? { Origin: origin } : {},
        // Add other required APIGatewayProxyEvent properties with minimal values
        httpMethod: 'POST',
        path: '/graphql',
        resource: '',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        body: null,
        isBase64Encoded: false,
        multiValueHeaders: {},
    })

    const createMockResponse = (headers = {}) => ({
        headers,
        statusCode: 200,
        body: 'test body',
    })

    it.each([
        // Invalid response object cases
        [
            null,
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            null,
            'null response',
        ],
        [
            undefined,
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            null,
            'undefined response',
        ],
        [
            'string',
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            null,
            'string response',
        ],
        [
            123,
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            null,
            'number response',
        ],
        [
            {},
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            null,
            'object without headers property',
        ],

        // Missing request origin cases
        [
            createMockResponse(),
            createMockEvent(),
            'APPLICATION_ENDPOINT=https://app.com',
            'Cors configuration error. Request origin is undefined.',
            'missing Origin header',
        ],
        [
            createMockResponse(),
            createMockEvent(''),
            'APPLICATION_ENDPOINT=https://app.com',
            'Cors configuration error. Request origin is undefined.',
            'empty Origin header',
        ],

        // Missing APPLICATION_ENDPOINT cases
        [
            createMockResponse(),
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=null',
            'Cors configuration error. APPLICATION_ENDPOINT environment variable is undefined.',
            'missing APPLICATION_ENDPOINT',
        ],
        [
            createMockResponse(),
            createMockEvent('https://example.com'),
            'APPLICATION_ENDPOINT=',
            'Cors configuration error. APPLICATION_ENDPOINT environment variable is undefined.',
            'empty APPLICATION_ENDPOINT',
        ],

        // // Origin not allowed cases (isOriginAllowed returns false)
        [
            createMockResponse(),
            createMockEvent('https://space.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            'Cors configuration error. Request origin https://space.com not allowed. Allowed Origins: https://app.com',
            'origin not in allowed list',
        ],
        [
            createMockResponse(),
            createMockEvent('https://space.com'),
            'APPLICATION_ENDPOINT=https://app.com;INTERNAL_ALLOWED_ORIGINS=*.salesforce.com,*.cms.gov',
            'Cors configuration error. Request origin https://space.com not allowed. Allowed Origins: https://app.com,*.salesforce.com,*.cms.gov',
            'origin not in allowed list with internal origins',
        ],

        // Successful cases (isOriginAllowed returns true) - these should return undefined (no error)
        [
            createMockResponse(),
            createMockEvent('https://app.com'),
            'APPLICATION_ENDPOINT=https://app.com',
            undefined,
            'exact match with APPLICATION_ENDPOINT',
        ],
        [
            createMockResponse(),
            createMockEvent('https://test.salesforce.com'),
            'APPLICATION_ENDPOINT=https://app.com;INTERNAL_ALLOWED_ORIGINS=*.salesforce.com,*.cms.gov',
            undefined,
            'wildcard match with internal origins',
        ],
        [
            createMockResponse(),
            createMockEvent('https://app.com'),
            'APPLICATION_ENDPOINT=https://app.com;INTERNAL_ALLOWED_ORIGINS= *.salesforce.com , *.cms.gov ',
            undefined,
            'with whitespace in internal origins',
        ],
    ] as const)(
        'should handle %s with event %s and env %s -> %s (%s)',
        (response, event, envString, expectedError, description) => {
            // Parse environment string
            const envPairs = envString.split(';').filter(Boolean)
            envPairs.forEach((pair) => {
                const [key, value] = pair.split('=')
                // null converts to string, the purpose is to delete this env variable. So, we check for 'null' and delete the variable
                if (value === 'null') {
                    delete process.env[key]
                } else {
                    process.env[key] = value || undefined
                }
            })

            // Mock isOriginAllowed based on expected behavior
            if (expectedError && expectedError.includes('not allowed')) {
                mockIsOriginAllowed.mockReturnValue(false)
            } else if (!expectedError && event.headers?.Origin) {
                mockIsOriginAllowed.mockReturnValue(true)
            }

            const result = configureCorsHeaders(response, event)

            if (expectedError) {
                expect(result).toBeInstanceOf(Error)
                expect((result as Error).message).toBe(expectedError)
            } else {
                expect(result).toBeUndefined()
            }
        }
    )

    describe('successful CORS configuration', () => {
        beforeEach(() => {
            process.env.APPLICATION_ENDPOINT = 'https://app.com'
            process.env.INTERNAL_ALLOWED_ORIGINS = '*.salesforce.com, *.cms.gov'
            mockIsOriginAllowed.mockReturnValue(true)
        })

        it('should set CORS headers correctly', () => {
            const response = createMockResponse({ 'existing-header': 'value' })
            const event = createMockEvent('https://test.salesforce.com')

            const result = configureCorsHeaders(response, event)

            expect(result).toBeUndefined()
            expect(response.headers).toEqual({
                'existing-header': 'value',
                'Access-Control-Allow-Origin': 'https://test.salesforce.com',
                'Access-Control-Allow-Headers':
                    'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
                'X-Content-Type-Options': 'nosniff',
            })
        })
    })
})
