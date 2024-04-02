import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { Resolvers, SubmissionReason } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import type { ContractPackageSubmissionWithCauseType } from '../../domain-models'

export function contractResolver(store: Store): Resolvers['Contract'] {
    return {
        initiallySubmittedAt(_parent) {
            // we're only working on drafts for now, this will need to change to
            // look at the revisions when we expand
            return null
        },
        state(parent) {
            const packageState = parent.stateCode
            const state = statePrograms.states.find(
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

        draftRates: async (parent, _args, context) => {
            const { span } = context
            const rateDataArray = parent.draftRevision?.rateRevisions || []

            return rateDataArray.map(async (rateData) => {
                if (rateData.formData.rateID === undefined) {
                    const errMessage = `rateID on ${rateData.id} is undefined`
                    logError('fetchContract', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                const rateResult = await store.findRateWithHistory(
                    rateData.formData.rateID
                )

                if (rateResult instanceof Error) {
                    const errMessage = `Could not find rate with id: ${rateData.id}. Message: ${rateResult.message}`
                    logError('fetchContract', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }
                return rateResult
            })
        },
        // not yet implemented, currently only working on drafts:
        packageSubmissions(parent) {
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
                        if (!prevSub) {
                            throw new Error(
                                'Programming Error: a non-contract submission must have a previous contract submission'
                            )
                        }
                        const previousRateRevisionIDs =
                            prevSub.rateRevisions.map((r) => r.id)
                        if (
                            previousRateRevisionIDs.includes(submittedRate.id)
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
    }
}
