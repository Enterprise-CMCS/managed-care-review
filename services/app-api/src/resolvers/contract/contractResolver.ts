import { typedStatePrograms } from '@mc-review/submissions'
import type { Resolvers, SubmissionReason } from '../../gen/gqlServer'
import { GraphQLError } from 'graphql'
import type {
    ContractPackageSubmissionWithCauseType,
    ContractType,
    RateRevisionType,
    UnlockedContractType,
} from '../../domain-models'
import path from 'path'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { convertToIndexQuestionsPayload } from '../../postgres/questionResponse'
import type { Context } from '../../handlers/apollo_gql'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'

// this is probably a little delicate type-wise. But seems worth it not to be duplicating the same resolver in two places.
function genericContractResolver<
    ParentType extends ContractType | UnlockedContractType,
>(store: Store, applicationEndpoint: string) {
    return {
        lastUpdatedForDisplay(parent: ParentType) {
            // These dates are mechanical, draft vs. submit vs. unlock, whatever is latest is latest
            const contractUpdated = parent.updatedAt
            const draftUpdated = parent.draftRevision?.updatedAt

            const lastSubmitted =
                parent.packageSubmissions.length > 0
                    ? parent.packageSubmissions[0].contractRevision.submitInfo
                          ?.updatedAt
                    : undefined
            const lastUnlocked = parent.draftRevision?.unlockInfo?.updatedAt
            const submitStatusDate =
                lastUnlocked || lastSubmitted || draftUpdated || contractUpdated

            // With review actions, we compare if the review action has happened more recently or not than the latest submit action
            if (
                parent.reviewStatusActions &&
                parent.reviewStatusActions.length > 0
            ) {
                const latestAction = parent.reviewStatusActions[0].updatedAt
                if (latestAction && latestAction > submitStatusDate) {
                    return latestAction
                }
            }

            return submitStatusDate
        },
        initiallySubmittedAt(parent: ParentType) {
            if (parent.packageSubmissions.length > 0) {
                const firstSubmission =
                    parent.packageSubmissions[
                        parent.packageSubmissions.length - 1
                    ]
                // Use override date if exists.
                return (
                    parent.contractOverrides?.[0]?.overrides
                        .initiallySubmittedAt ||
                    firstSubmission.submitInfo.updatedAt
                )
            }

            return null
        },
        state(parent: ParentType) {
            const packageState = parent.stateCode
            const state = typedStatePrograms.states.find(
                (st) => st.code === packageState
            )

            if (state === undefined) {
                const errMessage =
                    'State not found in database: ' + packageState
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            return state
        },
        dateContractDocsExecuted(parent: ParentType) {
            let dateFirstSubmitted: Date | null = null
            for (const sub of parent.packageSubmissions) {
                if (
                    sub.contractRevision.formData.contractExecutionStatus ===
                    'EXECUTED'
                ) {
                    dateFirstSubmitted =
                        sub.contractRevision.submitInfo?.updatedAt || null
                } else {
                    return dateFirstSubmitted
                }
            }
            return dateFirstSubmitted
        },
        webURL(parent: ParentType) {
            const urlPath = path.join(
                '/submissions/',
                ContractSubmissionTypeRecord[parent.contractSubmissionType],
                parent.id
            )
            return new URL(urlPath, applicationEndpoint).href
        },
        packageSubmissions(parent: ParentType) {
            const gqlSubs: ContractPackageSubmissionWithCauseType[] = []
            for (let i = 0; i < parent.packageSubmissions.length; i++) {
                const thisSub = parent.packageSubmissions[i]
                let prevSub = undefined
                if (i < parent.packageSubmissions.length - 1) {
                    prevSub = parent.packageSubmissions[i + 1]
                }

                // determine the cause for this submission
                let cause: SubmissionReason = 'CONTRACT_SUBMISSION'

                if (
                    !thisSub.submittedRevisions.find(
                        (r) => r.id === thisSub.contractRevision.id
                    )
                ) {
                    // not a contract submission, this contract wasn't in the submitted bits
                    const connectedRateRevisionIDs = thisSub.rateRevisions.map(
                        (r) => r.id
                    )
                    const submittedRate = thisSub.submittedRevisions.find((r) =>
                        connectedRateRevisionIDs.includes(r.id)
                    )

                    if (!submittedRate) {
                        cause = 'RATE_UNLINK'
                    } else {
                        const thisSubmittedRate =
                            submittedRate as RateRevisionType
                        if (!prevSub) {
                            throw new Error(
                                'Programming Error: a non-contract submission must have a previous contract submission'
                            )
                        }
                        const previousRateRevisionIDs =
                            prevSub.rateRevisions.map((r) => r.rateID)
                        if (
                            previousRateRevisionIDs.includes(
                                thisSubmittedRate.rateID
                            )
                        ) {
                            cause = 'RATE_SUBMISSION'
                        } else {
                            cause = 'RATE_LINK'
                        }
                    }
                }

                const gqlSub: ContractPackageSubmissionWithCauseType = {
                    cause,
                    submitInfo: thisSub.submitInfo,
                    submittedRevisions: thisSub.submittedRevisions,
                    contractRevision: thisSub.contractRevision,
                    rateRevisions: thisSub.rateRevisions,
                }

                gqlSubs.push(gqlSub)
            }

            return gqlSubs
        },

        questions: async (parent: ParentType, _args: any, context: Context) => {
            const { user, ctx, tracer } = context
            // add a span to OTEL
            const span = tracer?.startSpan(
                'fetchContractWithQuestionsResolver',
                {},
                ctx
            )
            setResolverDetailsOnActiveSpan(
                'fetchContractWithQuestions',
                user,
                span
            )

            const questionsForContract = await store.findAllQuestionsByContract(
                parent.id
            )

            if (questionsForContract instanceof Error) {
                const errMessage = `Issue finding contract message: ${questionsForContract.message}`
                setErrorAttributesOnActiveSpan(errMessage, span)

                if (questionsForContract instanceof NotFoundError) {
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

            return convertToIndexQuestionsPayload(questionsForContract)
        },
    }
}

export function unlockedContractResolver(
    store: Store,
    applicationEndpoint: string
): Resolvers['UnlockedContract'] {
    return genericContractResolver(store, applicationEndpoint)
}

export function contractResolver(
    store: Store,
    applicationEndpoint: string
): Resolvers['Contract'] {
    return genericContractResolver(store, applicationEndpoint)
}
