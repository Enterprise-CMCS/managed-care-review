import { Result } from 'neverthrow'
import { User as UserType } from '../../app-web/src/gen/gqlClient'

export type userFromAuthProvider = (
    authProvider: string
) => Promise<Result<UserType, Error>>
