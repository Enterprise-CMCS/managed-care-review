import { gql } from '@apollo/client'

export const CURRENT_USER = gql`
	query {
		getCurrentUser {
			email
			state
			role
			name
		}
	}
`
