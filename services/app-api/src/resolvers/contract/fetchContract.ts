import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

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

        setSuccessAttributesOnActiveSpan(span)
        return { contract: contractWithHistory }
    }
}
