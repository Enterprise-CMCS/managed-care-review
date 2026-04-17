import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors'
import { toGQLError } from './graphQLErrorAccessors'

const buildGraphQLErrorsResponse = (
    errors: Array<{
        message: string
        extensions?: Record<string, unknown>
    }>
) => new CombinedGraphQLErrors({ errors }, errors)

describe('toGQLError', () => {
    it('returns undefined when error is null or undefined', () => {
        expect(toGQLError(null)).toBeUndefined()
        expect(toGQLError(undefined)).toBeUndefined()
    })

    it('returns undefined for a plain Error that is not a CombinedGraphQLErrors', () => {
        expect(toGQLError(new Error('boom'))).toBeUndefined()
    })

    it('returns undefined for a ServerError (network error, not a GraphQL response error)', () => {
        const networkError = new ServerError('bad gateway', {
            response: new Response('', { status: 502 }),
            bodyText: '',
        })
        expect(toGQLError(networkError)).toBeUndefined()
    })

    it('returns undefined when CombinedGraphQLErrors has an empty errors array', () => {
        const err = buildGraphQLErrorsResponse([])
        expect(toGQLError(err)).toBeUndefined()
    })

    it('flattens the first GraphQL error with all resolver-provided extension fields', () => {
        const err = buildGraphQLErrorsResponse([
            {
                message: 'Contract not found',
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            },
        ])

        const result = toGQLError(err)

        expect(result).toBeDefined()
        expect(result?.message).toBe('Contract not found')
        expect(result?.extensions.code).toBe('NOT_FOUND')
        expect(result?.extensions.cause).toBe('DB_ERROR')
        expect(result?.extensions.argumentName).toBeUndefined()
        expect(result?.extensions.argumentValues).toBeUndefined()
    })

    it('surfaces BAD_USER_INPUT extensions (argumentName / argumentValues)', () => {
        const err = buildGraphQLErrorsResponse([
            {
                message: 'Invalid submission',
                extensions: {
                    code: 'BAD_USER_INPUT',
                    argumentName: 'contractID',
                    argumentValues: { id: 'abc-123' },
                },
            },
        ])

        const result = toGQLError(err)

        expect(result?.extensions.code).toBe('BAD_USER_INPUT')
        expect(result?.extensions.argumentName).toBe('contractID')
        expect(result?.extensions.argumentValues).toEqual({ id: 'abc-123' })
        expect(result?.extensions.cause).toBeUndefined()
    })

    it('only surfaces the first error when multiple GraphQL errors are returned', () => {
        const err = buildGraphQLErrorsResponse([
            {
                message: 'first',
                extensions: { code: 'FORBIDDEN' },
            },
            {
                message: 'second',
                extensions: { code: 'NOT_FOUND' },
            },
        ])

        const result = toGQLError(err)

        expect(result?.message).toBe('first')
        expect(result?.extensions.code).toBe('FORBIDDEN')
    })

    it('leaves extension fields undefined when they are missing', () => {
        const err = buildGraphQLErrorsResponse([
            { message: 'unknown failure' },
        ])

        const result = toGQLError(err)

        expect(result?.message).toBe('unknown failure')
        expect(result?.extensions.code).toBeUndefined()
        expect(result?.extensions.cause).toBeUndefined()
        expect(result?.extensions.argumentName).toBeUndefined()
        expect(result?.extensions.argumentValues).toBeUndefined()
    })

    it('guards against non-string extension values for string fields', () => {
        const err = buildGraphQLErrorsResponse([
            {
                message: 'bad extension shape',
                extensions: {
                    code: 500, // wrong type: number instead of string
                    cause: { reason: 'db' }, // wrong type: object
                    argumentName: null,
                    argumentValues: 'this one is fine as unknown',
                },
            },
        ])

        const result = toGQLError(err)

        expect(result?.extensions.code).toBeUndefined()
        expect(result?.extensions.cause).toBeUndefined()
        expect(result?.extensions.argumentName).toBeUndefined()
        expect(result?.extensions.argumentValues).toBe(
            'this one is fine as unknown'
        )
    })
})
