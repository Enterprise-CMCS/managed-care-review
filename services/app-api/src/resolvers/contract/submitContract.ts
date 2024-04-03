import type { Emailer } from '../../emailer'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { EmailParameterStore } from '../../parameterStore'
import type { Store } from '../../postgres'
import { submitHealthPlanPackageResolver } from '../healthPlanPackage'

export function submitContract(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['submitContract'] {
    return async (parent, { input }, context) => {
        // For some reason the types for resolvers are not actually callable?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submitHPPResolver = submitHealthPlanPackageResolver(
            store,
            emailer,
            emailParameterStore,
            launchDarkly
        ) as any

        await submitHPPResolver(
            parent,
            { input: { pkgID: input.contractID } },
            context
        )

        const contract = await store.findContractWithHistory(input.contractID)

        if (contract instanceof Error) {
            throw contract
        }

        return {
            contract,
        }
    }
}
