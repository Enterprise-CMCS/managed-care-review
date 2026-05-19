import { createForbiddenError } from '../errorUtils'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql/index'

export function indexUsersResolver(store: Store): QueryResolvers['indexUsers'] {
    return async (_parent, _args, context) => {
        const { user: currentUser, ctx, tracer } = context
        const span = tracer?.startSpan('indexUser', {}, ctx)
        setResolverDetailsOnActiveSpan('indexUsers', currentUser, span)

        if (
            !hasAdminPermissions(currentUser) &&
            !hasCMSPermissions(currentUser)
        ) {
            const errMsg = 'user not authorized to fetch users'
            logError('indexUsers', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }

        const findResult = await store.findAllUsers()
        if (findResult instanceof Error) {
            const errMessage = `Error querying users. ${findResult.message}`
            logError('indexUsers', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            })
        }

        const userEdges = findResult.map((user) => {
            return {
                node: {
                    ...user,
                },
            }
        })

        return {
            totalCount: userEdges.length,
            edges: userEdges,
        }
    }
}
