import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logError } from '../../logger'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import type { DocumentZipPackageType } from '../../domain-models/ZipType'
import type { RateRevisionType } from '../../domain-models'
import type { Context } from '../../handlers/apollo_gql'

export function rateRevisionResolver(store: Store): Resolvers['RateRevision'] {
    return {
        rate: async (parent, _args, context) => {
            const { ctx, tracer } = context
            const span = tracer?.startSpan('rateRevisionResolver.rate', {}, ctx)

            const rate = await store.findRateWithHistory(parent.rateID)
            if (rate instanceof Error) {
                const errMessage = `Issue finding rate with id: ${parent.rateID}. Message: ${rate.message}`
                logError('rateRevisionResolver.rate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            return rate
        },
        documentZipPackages: async (
            parent: RateRevisionType,
            _args: Record<string, never>,
            context: Context
        ): Promise<DocumentZipPackageType[]> => {
            const { ctx, tracer } = context
            const span = tracer?.startSpan(
                'fetchRateRevisionZipPackages',
                {},
                ctx
            )

            try {
                const documentZipPackages =
                    await store.findDocumentZipPackagesByRateRevision(parent.id)

                if (documentZipPackages instanceof Error) {
                    const errMessage = `Error fetching document zip packages for rate revision ${parent.id}: ${documentZipPackages.message}`
                    logError('rateRevision.documentZipPackages', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    return []
                }

                return documentZipPackages
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error)
                const errMessage = `Unexpected error fetching document zip packages: ${errorMessage}`
                logError('rateRevision.documentZipPackages', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                return []
            } finally {
                span?.end()
            }
        },
    }
}
