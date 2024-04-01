import { ForbiddenError } from 'apollo-server-core'
import { isStateUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'

export function submitContract(
    store: Store
): MutationResolvers['submitContract'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('submitContract', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            const errMsg =
                'submitContract: user not authorized to create state data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError('user not authorized to create state data')
        }

        const realSubmitReason = input.submittedReason || 'Initial Submit'

        const contract = await store.submitContract({
            contractID: input.contractID,
            submittedReason: realSubmitReason,
            submittedByUserID: context.user.id,
        })

        if (contract instanceof Error) {
            throw contract
        }

        return {
            contract,
        }
    }
}
