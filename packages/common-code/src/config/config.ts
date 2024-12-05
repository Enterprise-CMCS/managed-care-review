function isAuthMode(opt: unknown): opt is AuthModeType {
    if (opt && typeof opt === 'string') {
        return ['LOCAL', 'AWS_COGNITO', 'IDM'].includes(opt)
    }
    return false
}

function assertIsAuthMode(opt: unknown): asserts opt is AuthModeType {
    if (!isAuthMode(opt)) {
        throw new Error('Those are not Login Options')
    }
}

function assertNever(x: unknown): never {
    throw new Error('Unexpected object: ' + x)
}

export type AuthModeType = 'LOCAL' | 'AWS_COGNITO' | 'IDM'
export { assertIsAuthMode, assertNever }
