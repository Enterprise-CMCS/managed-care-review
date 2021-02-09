import { Result, ok, err } from 'neverthrow'
import { StateUser, User } from '../models/user'

export async function userFromLocalAuthProvider(authProvider: string): Promise<Result<User,Error>> {

        const user: StateUser = {
            email: 'local@gmail.local',
            name: 'mee bee',
            state: 'VA',
            role: 'STATE_USER',
        }

        return ok(user)
}