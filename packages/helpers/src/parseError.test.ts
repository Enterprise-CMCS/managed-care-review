import { parseErrorToError } from './parseError'

describe('parseErrorToError', () => {
    it('passes through Error instances unchanged', () => {
        const err = new Error('boom')
        expect(parseErrorToError(err)).toBe(err)
    })

    it('passes through Error subclasses unchanged', () => {
        const err = new TypeError('nope')
        const result = parseErrorToError(err)
        expect(result).toBe(err)
        expect(result).toBeInstanceOf(TypeError)
    })

    it('wraps strings as Error messages', () => {
        const result = parseErrorToError('something failed')
        expect(result).toBeInstanceOf(Error)
        expect(result.message).toBe('something failed')
    })

    it('uses object.message when present', () => {
        const result = parseErrorToError({ message: 'db timeout' })
        expect(result).toBeInstanceOf(Error)
        expect(result.message).toBe('db timeout')
    })

    it('copies enumerable non-message fields onto the returned Error', () => {
        const awsLike = {
            message: 'AccessDenied',
            code: 'AccessDenied',
            statusCode: 403,
        }
        const result = parseErrorToError(awsLike) as Error & {
            code?: string
            statusCode?: number
        }
        expect(result.message).toBe('AccessDenied')
        expect(result.code).toBe('AccessDenied')
        expect(result.statusCode).toBe(403)
    })

    it('does not overwrite Error name/stack with values from the source object', () => {
        const weird = {
            message: 'real message',
            name: 'FakeName',
            stack: 'fake stack',
        }
        const result = parseErrorToError(weird)
        expect(result.name).toBe('Error')
        expect(result.stack).not.toBe('fake stack')
    })

    it('falls back to a stringified message when object has no string message', () => {
        const result = parseErrorToError({ foo: 'bar' })
        expect(result).toBeInstanceOf(Error)
        expect(result.message).toBeTruthy()
    })

    it('handles null and undefined', () => {
        expect(parseErrorToError(null).message).toBe('null')
        expect(parseErrorToError(undefined).message).toBe('undefined')
    })

    it('handles primitives (number, boolean)', () => {
        expect(parseErrorToError(42).message).toBe('42')
        expect(parseErrorToError(false).message).toBe('false')
    })

    it('ignores fields that throw while being copied', () => {
        const source = { message: 'boom', ok: 123 as number, flaky: 'value' as string }
        Object.defineProperty(source, 'flaky', {
            enumerable: true,
            get() {
                throw new Error('cannot read flaky')
            },
        })

        const result = parseErrorToError(source) as Error & {
            ok?: number
            flaky?: string
        }

        expect(result.message).toBe('boom')
        expect(result.ok).toBe(123)
        expect(result.flaky).toBeUndefined()
    })

    it('returns a fallback error when stringification throws', () => {
        const primitiveLike = {
            [Symbol.toPrimitive]() {
                throw new Error('no conversion')
            },
        }

        const objectLike = {
            get message() {
                return 123
            },
            [Symbol.toPrimitive]() {
                throw new Error('no conversion')
            },
        }

        expect(parseErrorToError(primitiveLike).message).toBe('Unknown error')
        expect(parseErrorToError(objectLike).message).toBe('Unknown error')
    })
})
