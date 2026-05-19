import { packageName } from '@mc-review/submissions'
import type { ContractRevisionType } from '../../domain-models'
import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { logError, logResolverError } from '../../logger'
import type { DocumentZipPackageType } from '../../domain-models/ZipType'
import type { Context } from '../../handlers/apollo_gql'
import { parseErrorToError } from '@mc-review/helpers'
import { GraphQLError } from 'graphql/index'

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
                const errMessage = `Failed to fetch state programs. ${programsForContractState.message}`
                logError('contractRevisionStrippedResolver', errMessage)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            return packageName(
                stateCode,
                parent.contract.stateNumber,
                parent.formData.programIDs,
                programsForContractState ?? []
            )
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
                    logResolverError(
                        'contractRevision.documentZipPackages',
                        errMessage,
                        context
                    )
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    return []
                }
                return documentZipPackages
            } catch (error) {
                const errorMessage = parseErrorToError(error).message
                const errMessage = `Unexpected error fetching document zip packages: ${errorMessage}`
                logResolverError(
                    'contractRevision.documentZipPackages',
                    errMessage,
                    context
                )
                setErrorAttributesOnActiveSpan(errMessage, span)
                return []
            } finally {
                span?.end()
            }
        },
    }
}

export function contractRevisionStrippedResolver(
    store: Store
): Resolvers['ContractRevisionStripped'] {
    return {
        contractID: (parent) => {
            return parent.contract.id
        },
        contractName(parent) {
            const stateCode = parent.contract.stateCode
            const programsForContractState = store.findStatePrograms(stateCode)
            if (programsForContractState instanceof Error) {
                const errMessage = `Failed to fetch state programs. ${programsForContractState.message}`
                logError('contractRevisionStrippedResolver', errMessage)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }
            return packageName(
                stateCode,
                parent.contract.stateNumber,
                parent.formData.programIDs,
                programsForContractState ?? []
            )
        },
    }
}
