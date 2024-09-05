import { packageName } from '@mc-review/hpp'
import type { ContractRevisionType } from '../../domain-models'
import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'

export function contractRevisionResolver(
    store: Store
): Resolvers['ContractRevision'] {
    return {
        contractName(parent: ContractRevisionType): string {
            const stateCode = parent.contract.stateCode
            const programsForContractState = store.findStatePrograms(stateCode)
            if (programsForContractState instanceof Error) {
                throw programsForContractState
            }

            const contractName = packageName(
                stateCode,
                parent.contract.stateNumber,
                parent.formData.programIDs,
                programsForContractState ?? []
            )

            return contractName
        },
    }
}
