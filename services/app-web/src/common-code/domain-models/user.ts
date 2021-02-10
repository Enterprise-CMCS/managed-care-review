type Role = 'STATE_USER' | 'ADMIN'

type State = 'VA' | 'GA' | 'TN' | 'MN'

export type User = StateUser

export type StateUser = {
	// typename: string = 'StateUser';
	role: Role
	email: string
	state: State
	name: string
}

export function isUser(user: unknown): user is User {
	if (user && typeof user === 'object') {
		if ('role' in user) {
			const roleUser = user as { role: unknown }
			if (typeof roleUser.role === 'string') {
				if (
					roleUser.role === 'STATE_USER' ||
					roleUser.role === 'ADMIN'
				) {
					return true
				}
			}
		}
	}

	return false
}
