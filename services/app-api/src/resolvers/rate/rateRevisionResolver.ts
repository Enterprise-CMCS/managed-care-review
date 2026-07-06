import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logResolverError } from '../../logger'
import {
    recordResolverError,
    setResolverDetails,
    withResolverSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import type { DocumentZipPackageType } from '../../domain-models/ZipType'
import type { RateRevisionType } from '../../domain-models'
import type { Context } from '../../handlers/apollo_gql'
import { parseErrorToError } from '@mc-review/helpers'

export function rateRevisionResolver(store: Store): Resolvers['RateRevision'] {
    return {
        rate: async (parent, _args, context) => {
            return withResolverSpan(
                context,
                'RateRevision.rate',
                {
                    'rate.id': parent.rateID,
                    'rate_revision.id': parent.id,
                },
                async (span) => {
                    setResolverDetails(span, context.user)

                    const rate = await store.findRateWithHistory(parent.rateID)
                    if (rate instanceof Error) {
                        const errMessage = `Issue finding rate with id: ${parent.rateID}. Message: ${rate.message}`
                        logResolverError(
                            'rateRevisionResolver.rate',
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
                    return rate
                }
            )
        },
        documentZipPackages: async (
            parent: RateRevisionType,
            _args: Record<string, never>,
            context: Context
        ): Promise<DocumentZipPackageType[]> => {
            return withResolverSpan(
                context,
                'RateRevision.documentZipPackages',
                { 'rate_revision.id': parent.id },
                async (span) => {
                    setResolverDetails(span, context.user)

                    try {
                        const documentZipPackages =
                            await store.findDocumentZipPackagesByRateRevision(
                                parent.id
                            )

                        if (documentZipPackages instanceof Error) {
                            const errMessage = `Error fetching document zip packages for rate revision ${parent.id}: ${documentZipPackages.message}`
                            logResolverError(
                                'rateRevision.documentZipPackages',
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
                            'rateRevision.documentZipPackages',
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
