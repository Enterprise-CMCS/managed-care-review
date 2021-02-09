import { Result, ok } from 'neverthrow'
import { StateUser, User } from '../models/user'

export async function userFromLocalAuthProvider(authProvider: string): Promise<Result<User,Error>> {

        const user: StateUser = {
            email: authProvider,
            name: 'mee bee',
            state: 'VA',
            role: 'STATE_USER',
        }

        return ok(user)
}