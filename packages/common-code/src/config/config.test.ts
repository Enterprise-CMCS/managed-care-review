import { assertNever, assertIsAuthMode } from './'

describe('auth type assertions', () => {
    it('assertNever returns as expected', () => {
        // oxlint-disable-next-line typescript/ban-ts-comment
        // @ts-ignore-next-line
        expect(() => assertNever('LOCAL')).toThrow()
        // oxlint-disable-next-line typescript/ban-ts-comment
        // @ts-ignore-next-line
        expect(() => assertNever('anything at all')).toThrow()
    })

    it('assertIsAuthMode returns as expected', () => {
        expect(() => assertIsAuthMode({ authMode: 'LOCAL' })).toThrow()
        expect(() => assertIsAuthMode('LOCAL')).not.toThrow()
        expect(() => assertIsAuthMode('AWS_COGNITO')).not.toThrow()
        expect(() => assertIsAuthMode('IDM')).not.toThrow()
    })
})
