export type AuthModeType = 'LOCAL' | 'AWS_COGNITO' | 'IDM'

export function isAuthMode(opt: unknown): opt is AuthModeType {
    if (opt && typeof opt === 'string') {
        return ['LOCAL', 'AWS_COGNITO', 'IDM'].includes(opt)
    }
    return false
}

export function assertIsAuthMode(opt: unknown): asserts opt is AuthModeType {
    if (!isAuthMode(opt)) {
        throw new Error('Those are not Login Options')
    }
}

export function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x)
}
