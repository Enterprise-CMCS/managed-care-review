import { GraphQLErrors } from '@apollo/client/errors'
import { GraphQLError } from 'graphql'
import { DraftSubmission, StateSubmission } from '../gen/gqlClient'

const isStateSubmission = (
    submission: DraftSubmission | StateSubmission
): submission is StateSubmission => {
    if (submission.__typename === 'StateSubmission') {
        return true
    } else return false
}

const isGraphQLErrors = (
    input: unknown 
): input is GraphQLErrors => {
    if (Array.isArray(input)) {
        return input.every(i => {
            return i instanceof GraphQLError
        })
    }
    return false
}

export { isStateSubmission, isGraphQLErrors }
