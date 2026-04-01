import { GraphQLError } from 'graphql'
import type {
    QueryResolvers,
    RelatedContractStripped,
} from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
} from '../../domain-models'
import { canRead } from '../../authorization/oauthAuthorization'
import { logError, logSuccess } from '../../logger'

type GraphQLSafeRelatedContract = {
    id: string
    stateCode: string
    stateNumber: number
    contractSubmissionType: 'HEALTH_PLAN' | 'EQRO'
    consolidatedStatus:
        | 'SUBMITTED'
        | 'DRAFT'
        | 'UNLOCKED'
        | 'RESUBMITTED'
        | 'APPROVED'
        | 'WITHDRAWN'
        | 'NOT_SUBJECT_TO_REVIEW'
    status?: 'SUBMITTED' | 'DRAFT' | 'UNLOCKED' | 'RESUBMITTED' | undefined
    reviewStatus?:
        | 'UNDER_REVIEW'
        | 'APPROVED'
        | 'WITHDRAWN'
        | 'NOT_SUBJECT_TO_REVIEW'
        | undefined
    mccrsID?: string | undefined
}

export function fetchSDPResolver(store: Store): QueryResolvers['fetchSDP'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchSDP',
            { 'sdp.id': input.sdpID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage =
                        'OAuth client does not have read permissions'
                    logError('fetchSDP', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                const sdpWithHistory = await store.findSDPWithHistory(
                    input.sdpID
                )

                if (sdpWithHistory instanceof Error) {
                    const errMessage = `Issue finding SDP message: ${sdpWithHistory.message}`

                    if (sdpWithHistory instanceof NotFoundError) {
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

                if (isStateUser(user)) {
                    if (user.stateCode !== sdpWithHistory.stateCode) {
                        const authInfo = !!context.oauthClient
                        const errMessage = authInfo
                            ? `OAuth client not allowed to access SDP from ${sdpWithHistory.stateCode}`
                            : `User from state ${user.stateCode} not allowed to access SDP from ${sdpWithHistory.stateCode}`
                        logError('fetchSDP', errMessage)
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'FORBIDDEN',
                                cause: 'INVALID_STATE_REQUESTER',
                            },
                        })
                    }
                } else if (
                    !hasCMSPermissions(user) &&
                    !hasAdminPermissions(user)
                ) {
                    const errMessage = 'User not allowed to access SDP'
                    logError('fetchSDP', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INVALID_STATE_REQUESTER',
                        },
                    })
                }

                logSuccess(
                    context.oauthClient ? 'fetchSDP - oauthClient' : 'fetchSDP'
                )

                const relatedContracts: RelatedContractStripped[] | undefined =
                    sdpWithHistory.relatedContracts
                        ?.filter(
                            (
                                contract
                            ): contract is GraphQLSafeRelatedContract =>
                                contract.contractSubmissionType !== 'SDP' &&
                                contract.consolidatedStatus !== undefined
                        )
                        .map((contract) => ({
                            id: contract.id,
                            contractName: null,
                            stateCode: contract.stateCode,
                            stateNumber: contract.stateNumber,
                            contractSubmissionType:
                                contract.contractSubmissionType,
                            consolidatedStatus: contract.consolidatedStatus,
                            status: contract.status ?? null,
                            reviewStatus: contract.reviewStatus ?? null,
                            mccrsID: contract.mccrsID ?? null,
                        }))

                return {
                    sdp: {
                        ...sdpWithHistory,
                        relatedContracts,
                    },
                } as any
            }
        )
    }
}
