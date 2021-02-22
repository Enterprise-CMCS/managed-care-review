type Role = 'STATE_USER' | 'ADMIN'

export type StateCode = 'VA' | 'GA' | 'TN' | 'MN'

export type UserType = StateUserType

export type StateUserType = {
	// typename: string = 'StateUser';
	role: Role
	email: string
	state: StateCode
	name: string
}

export function isUser(user: unknown): user is UserType {
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
