import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'

export function submitContract(
    store: Store
): MutationResolvers['submitContract'] {
    return async (_parent, { input }, context) => {
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
