import { gql } from '@apollo/client'

export const CURRENT_USER = gql`
	query {
		currentUser {
			email
			state
			role
			name
		}
	}
`
