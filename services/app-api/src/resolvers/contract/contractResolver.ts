import { typedStatePrograms } from '@mc-review/submissions'
import type { Resolvers, SubmissionReason } from '../../gen/gqlServer'
import { GraphQLError } from 'graphql'
import type {
    ContractPackageSubmissionWithCauseType,
    ContractType,
    RateRevisionType,
    UnlockedContractType,
} from '../../domain-models'
import { isStateUser } from '../../domain-models'
import type { StrippedContractType } from '../../domain-models'
import path from 'path'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import { setResolverDetailsOnActiveSpan } from '../attributeHelper'
import { convertToIndexQuestionsPayload } from '../../postgres/questionResponse'
import type { Context } from '../../handlers/apollo_gql'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'
import { logResolverError } from '../../logger'
import { resolveInitiallySubmittedAtOverride } from '../shared/overrideHelpers'
import { latestDate } from '../helpers'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { buildContractActionLog } from './contractActionLog'

async function findQuestionsForContract(
    store: Store,
    contractID: string,
    context: Context,
    resolverName: string
) {
    const questionsForContract =
        await store.findAllQuestionsByContract(contractID)

    if (questionsForContract instanceof Error) {
        const errMessage = `Issue finding contract message: ${questionsForContract.message}`
        logResolverError(resolverName, errMessage, context)

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

    return questionsForContract
}

async function useStoredActionDates(
    launchDarkly: LDService,
    context: Context
): Promise<boolean> {
    const flagValue = await launchDarkly.getFeatureFlag({
        key: context.user.email,
        flag: 'use-stored-contract-action-dates',
    })
    return flagValue === true
}

function getStoredActionDateForDisplay(
    contract: Pick<
        ContractType | UnlockedContractType | StrippedContractType,
        'lastActionDate' | 'draftRevision' | 'updatedAt'
    >,
    context: Context
): Date {
    // Include draft update dates for state users.
    if (isStateUser(context.user)) {
        return (
            latestDate([
                contract.lastActionDate,
                contract.draftRevision?.updatedAt,
            ]) ?? contract.updatedAt
        )
    }

    // CMS/Admin users use lastActionDate, they do no have visibility of draft
    // changes.
    if (contract.lastActionDate) {
        return contract.lastActionDate
    }

    // Fallback to updatedAt date
    return contract.updatedAt
}

// this is probably a little delicate type-wise. But seems worth it not to be duplicating the same resolver in two places.
function genericContractResolver<
    ParentType extends ContractType | UnlockedContractType,
>(store: Store, applicationEndpoint: string, launchDarkly: LDService) {
    return {
        async lastUpdatedForDisplay(
            parent: ParentType,
            _args: unknown,
            context: Context
        ) {
            if (await useStoredActionDates(launchDarkly, context)) {
                return getStoredActionDateForDisplay(parent, context)
            }

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
                return resolveInitiallySubmittedAtOverride(
                    firstSubmission.submitInfo.updatedAt,
                    parent.contractOverrides
                )
            }

            return null
        },
        state(
            parent: ParentType,
            _args: Record<string, never>,
            context: Context
        ) {
            const packageState = parent.stateCode
            const state = typedStatePrograms.states.find(
                (st) => st.code === packageState
            )

            if (state === undefined) {
                const errMessage =
                    'State not found in database: ' + packageState
                logResolverError(
                    'genericContractResolver.state',
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
        packageSubmissions(
            parent: ParentType,
            _args: Record<string, never>,
            context: Context
        ) {
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
                            const errorMsg =
                                'Cannot determine contract package submission cause: non-contract package submission is missing a previous package submission'
                            logResolverError(
                                'genericContractResolver.packageSubmissions',
                                errorMsg,
                                context
                            )
                            throw new GraphQLError(errorMsg, {
                                extensions: {
                                    code: 'INTERNAL_SERVER_ERROR',
                                    cause: 'DB_ERROR',
                                },
                            })
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

        contractActionLog: async (
            parent: ParentType,
            _args: Record<string, never>,
            context: Context
        ) => {
            const questionsForContract = await findQuestionsForContract(
                store,
                parent.id,
                context,
                'genericContractResolver.contractActionLog'
            )

            return buildContractActionLog({
                ...parent,
                questions: convertToIndexQuestionsPayload(questionsForContract),
            })
        },

        questions: async (
            parent: ParentType,
            _args: Record<string, never>,
            context: Context
        ) => {
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

            const questionsForContract = await findQuestionsForContract(
                store,
                parent.id,
                context,
                'genericContractResolver.questions'
            )

            return convertToIndexQuestionsPayload(questionsForContract)
        },
    }
}

export function contractStrippedResolver(
    launchDarkly: LDService
): Resolvers['ContractStripped'] {
    return {
        async lastUpdatedForDisplay(
            parent: StrippedContractType,
            _args: unknown,
            context: Context
        ) {
            if (await useStoredActionDates(launchDarkly, context)) {
                return getStoredActionDateForDisplay(parent, context)
            }

            const contractUpdated = parent.updatedAt
            const draftUpdated = parent.draftRevision?.updatedAt

            const lastSubmitted =
                parent.latestSubmittedRevision?.submitInfo?.updatedAt
            const lastUnlocked = parent.draftRevision?.unlockInfo?.updatedAt
            const submitStatusDate =
                lastUnlocked || lastSubmitted || draftUpdated || contractUpdated

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
        initiallySubmittedAt(parent: StrippedContractType) {
            return parent.initiallySubmittedAt || null
        },
        state(
            parent: StrippedContractType,
            _args: Record<string, never>,
            context: Context
        ) {
            const packageState = parent.stateCode
            const state = typedStatePrograms.states.find(
                (st) => st.code === packageState
            )

            if (state === undefined) {
                const errMessage =
                    'State not found in database: ' + packageState
                logResolverError(
                    'contractStrippedResolver.state',
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
            return state
        },
    }
}

export function unlockedContractResolver(
    store: Store,
    applicationEndpoint: string,
    launchDarkly: LDService
): Resolvers['UnlockedContract'] {
    return genericContractResolver(store, applicationEndpoint, launchDarkly)
}

export function contractResolver(
    store: Store,
    applicationEndpoint: string,
    launchDarkly: LDService
): Resolvers['Contract'] {
    return genericContractResolver(store, applicationEndpoint, launchDarkly)
}
