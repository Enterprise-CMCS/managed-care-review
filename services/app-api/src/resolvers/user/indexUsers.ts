import { createForbiddenError } from '../errorUtils'
import type { UserType } from '../../domain-models'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'

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
            logError('indexUsers', findResult.message)
            setErrorAttributesOnActiveSpan(findResult.message, span)
            throw new Error('Unexpected Error Querying Users')
        }

        const users: UserType[] = findResult
        const userEdges = users.map((user) => {
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
