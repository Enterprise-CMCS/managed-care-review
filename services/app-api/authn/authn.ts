import { Result } from 'neverthrow'
import { User } from '../../app-web/src/common-code/domain-models/user'

export type userFromAuthProvider = (authProvider: string) => Promise<Result<User,Error>>
