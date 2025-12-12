import { packageName } from '@mc-review/submissions'
import type { ContractRevisionType } from '../../domain-models'
import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { logError } from '../../logger'
import type { DocumentZipPackageType } from '../../domain-models/ZipType'
import type { Context } from '../../handlers/apollo_gql'

export function contractRevisionResolver(
    store: Store
): Resolvers['ContractRevision'] {
    return {
        contractID: (parent) => {
            return parent.contract.id
        },
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
        documentZipPackages: async (
            parent: ContractRevisionType,
            _args: Record<string, never>,
            context: Context
        ): Promise<DocumentZipPackageType[]> => {
            const { ctx, tracer } = context
            const span = tracer?.startSpan(
                'fetchContractRevisionZipPackages',
                {},
                ctx
            )

            try {
                const documentZipPackages =
                    await store.findDocumentZipPackagesByContractRevision(
                        parent.id
                    )

                if (documentZipPackages instanceof Error) {
                    const errMessage = `Error fetching document zip packages for contract revision ${parent.id}: ${documentZipPackages.message}`
                    logError('contractRevision.documentZipPackages', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    return []
                }
                return documentZipPackages
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error)
                const errMessage = `Unexpected error fetching document zip packages: ${errorMessage}`
                logError('contractRevision.documentZipPackages', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                return []
            } finally {
                span?.end()
            }
        },
    }
}
