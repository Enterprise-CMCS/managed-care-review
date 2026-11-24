import { storageSmokeFailure } from '../../utils/storageSmokeDiagnostics'

describe('storage smoke failure diagnostics', () => {
    it('identifies the operation and an HTTP denial without logging a response body', () => {
        const error = storageSmokeFailure(
            'HEALTH_PLAN_DOCS',
            false,
            'put',
            new Error('unsafe response'),
            403
        )
        expect(error.message).to.include('HEALTH_PLAN_DOCS at put')
        expect(error.message).to.include('HTTP 403')
        expect(error.message).not.to.include('unsafe response')
    })

    it('identifies GraphQL denial while dropping its raw message and request URL', () => {
        const error = storageSmokeFailure(
            'QUESTION_ANSWER_DOCS',
            true,
            'scan',
            {
                name: 'CombinedGraphQLErrors',
                errors: [
                    {
                        message:
                            'https://private.example/file?signature=secret',
                        extensions: { code: 'FORBIDDEN' },
                    },
                ],
            }
        )
        expect(error.message).to.include('at scan')
        expect(error.message).to.include('CombinedGraphQLErrors')
        expect(error.message).to.include('GraphQL FORBIDDEN')
        expect(error.message).not.to.include('private.example')
        expect(error.message).not.to.include('secret')
    })

    it('identifies browser transport and timeout errors', () => {
        for (const name of ['TypeError', 'AbortError', 'TimeoutError']) {
            const error = storageSmokeFailure(
                'HEALTH_PLAN_DOCS',
                false,
                'get',
                { name, message: 'unsafe URL' }
            )
            expect(error.message).to.include(name)
            expect(error.message).not.to.include('unsafe URL')
        }
    })

    it('identifies authentication failures that occur before the Apollo callback', () => {
        const error = storageSmokeFailure(
            'HEALTH_PLAN_DOCS',
            false,
            'authentication',
            { name: 'NotAuthorizedException', message: 'unsafe auth details' }
        )
        expect(error.message).to.include('at authentication')
        expect(error.message).to.include('NotAuthorizedException')
        expect(error.message).not.to.include('unsafe auth details')
    })

    it('uses an allowlist for error names and GraphQL codes', () => {
        const error = storageSmokeFailure(
            'HEALTH_PLAN_DOCS',
            false,
            'current-user',
            {
                name: 'signature=private-token',
                statusCode: 'private-token',
                errors: [
                    null,
                    { extensions: { code: 'private-token' } },
                    { extensions: { code: 'INTERNAL_SERVER_ERROR' } },
                ],
            }
        )
        expect(error.message).to.include('unclassified error')
        expect(error.message).to.include('GraphQL INTERNAL_SERVER_ERROR')
        expect(error.message).not.to.include('private-token')
        expect(error.message).not.to.include('HTTP')
    })

    it('does not retain the original cause or stack', () => {
        const original = new Error('private-token')
        original.stack = 'private-token'
        const error = storageSmokeFailure(
            'HEALTH_PLAN_DOCS',
            false,
            'checksum',
            original
        )
        expect(error.cause).to.equal(undefined)
        expect(error.stack).not.to.include('private-token')
    })
})
