import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'

export function fetchContractResolver(
    store: Store
): QueryResolvers['fetchContract'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchContract', user, span)

        const contractWithHistory = await store.findContractWithHistory(
            input.contractID
        )

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (contractWithHistory instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // A state user cannot access contracts that don't belong to their state
        if (isStateUser(user)) {
            if (contractWithHistory.stateCode !== user.stateCode) {
                const errMessage = `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
                setErrorAttributesOnActiveSpan(errMessage, span)

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'FORBIDDEN',
                        cause: 'INVALID_STATE_REQUESTER',
                    },
                })
            }
        }

        setSuccessAttributesOnActiveSpan(span)
        return { contract: contractWithHistory }
    }
}
