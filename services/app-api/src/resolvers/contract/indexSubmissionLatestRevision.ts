import { createForbiddenError } from '../errorUtils'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import {
    hasAdminPermissions,
    hasCMSPermissions,
} from '../../domain-models/user'
import { NotFoundError } from '../../postgres/postgresErrors'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logError, logSuccess } from '../../logger'
import { GraphQLError } from 'graphql'
import { canRead } from '../../authorization/oauthAuthorization'

export function indexSubmissionLatestRevisionResolver(
    store: Store
): QueryResolvers['indexSubmissionLatestRevision'] {
    return async (_parent, args, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexSubmissionLatestRevision', {}, ctx)
        setResolverDetailsOnActiveSpan(
            'indexSubmissionLatestRevision',
            user,
            span
        )

        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('indexSubmissionLatestRevision', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

        const adminPermissions = hasAdminPermissions(user)
        const cmsUser = hasCMSPermissions(user)

        if (!adminPermissions && !cmsUser) {
            const errMsg = context.oauthClient
                ? 'OAuth client not authorized to fetch submission revisions'
                : 'user not authorized to fetch submission revisions'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }

        const DEFAULT_PAGE_SIZE = 1000
        const first = args.input?.pageSize ?? DEFAULT_PAGE_SIZE
        const afterContractID = args.input?.afterContractID ?? undefined

        // Fetch all contracts, sort in app code by lastUpdatedForDisplay desc,
        // then slice for cursor-based pagination.
        const result = await store.findLatestFlattenedContracts()

        if (result instanceof Error) {
            const errMessage = `Issue finding submission revisions: ${result.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (result instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Sort by lastUpdatedForDisplay descending (latest updated first)
        const sorted = result.contracts.sort(
            (a, b) =>
                b.lastUpdatedForDisplay.getTime() -
                a.lastUpdatedForDisplay.getTime()
        )

        // Find the start index based on the after contract ID
        let startIndex = 0
        if (afterContractID) {
            const cursorIndex = sorted.findIndex(
                (c) => c.contractId === afterContractID
            )
            if (cursorIndex !== -1) {
                startIndex = cursorIndex + 1
            }
        }

        const sliced = sorted.slice(startIndex, startIndex + first)
        const hasNextPage = startIndex + first < sorted.length
        const hasPreviousPage = startIndex > 0

        const edges = sliced.map((contract) => ({
            node: contract,
            cursor: contract.contractId,
        }))

        const pageInfo = {
            hasNextPage,
            hasPreviousPage,
            startContractID: edges.length > 0 ? edges[0].cursor : null,
            endContractID:
                edges.length > 0 ? edges[edges.length - 1].cursor : null,
        }

        logSuccess(
            context.oauthClient
                ? 'indexSubmissionLatestRevision - oauthClient'
                : 'indexSubmissionLatestRevision'
        )
        setSuccessAttributesOnActiveSpan(span)
        return { totalCount: result.totalCount, edges, pageInfo }
    }
}
