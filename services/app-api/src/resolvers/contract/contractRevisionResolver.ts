import { packageName } from '@mc-review/submissions'
import type {
    ContractRevisionType,
    StrippedContractRevisionType,
} from '../../domain-models'
import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import {
    recordResolverError,
    setResolverDetails,
    withResolverSpan,
} from '../attributeHelper'
import { logResolverError } from '../../logger'
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
        contractName(
            parent: ContractRevisionType,
            _args: Record<string, never>,
            context: Context
        ): string {
            const stateCode = parent.contract.stateCode
            const programsForContractState = store.findStatePrograms(stateCode)
            if (programsForContractState instanceof Error) {
                const errMessage = `Failed to fetch state programs. ${programsForContractState.message}`
                logResolverError(
                    'contractRevisionResolver.contractName',
                    errMessage,
                    context
                )
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
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
            return withResolverSpan(
                context,
                'ContractRevision.documentZipPackages',
                { 'contract_revision.id': parent.id },
                async (span) => {
                    setResolverDetails(span, context.user)

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
                            // This resolver intentionally falls back to an empty list, so record the non-fatal error on the span.
                            recordResolverError(span, errMessage)
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
                        // This resolver intentionally falls back to an empty list, so record the non-fatal error on the span.
                        recordResolverError(span, errMessage)
                        return []
                    }
                }
            )
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
        contractName(
            parent: StrippedContractRevisionType,
            _args: Record<string, never>,
            context: Context
        ) {
            const stateCode = parent.contract.stateCode
            const programsForContractState = store.findStatePrograms(stateCode)
            if (programsForContractState instanceof Error) {
                const errMessage = `Failed to fetch state programs. ${programsForContractState.message}`
                logResolverError(
                    'contractRevisionStrippedResolver.contractName',
                    errMessage,
                    context
                )
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
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
