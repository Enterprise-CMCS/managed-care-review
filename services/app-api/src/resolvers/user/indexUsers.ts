import { ForbiddenError } from 'apollo-server-lambda'
import { isAdminUser, UserType } from '../../domain-models'
import { isHelpdeskUser } from '../../domain-models/user'
import { QueryResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import { isStoreError, Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'

export function indexUsersResolver(store: Store): QueryResolvers['indexUsers'] {
    return async (_parent, _args, context) => {
        const { user: currentUser, span } = context
        setResolverDetailsOnActiveSpan('indexUsers', currentUser, span)

        if (!(isAdminUser(currentUser) || isHelpdeskUser(currentUser))) {
            const errMsg = 'user not authorized to fetch users'
            logError('indexUsers', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }

        const findResult = await store.findAllUsers()
        if (isStoreError(findResult)) {
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
