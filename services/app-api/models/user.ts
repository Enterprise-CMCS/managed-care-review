
type Role = 'STATE_USER' | 'ADMIN'

type State = 'VA' | 'GA' | 'TN'

export type User = StateUser

export type StateUser = {
	role: Role;
	email: string;
	state: State;
	name: string;
}