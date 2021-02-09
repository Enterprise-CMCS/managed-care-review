import { Result } from 'neverthrow'
import { User } from '../models/user'

export type userFromAuthProvider = (authProvider: string) => Promise<Result<User,Error>>
