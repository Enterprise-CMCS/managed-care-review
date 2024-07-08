import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { Resolvers, SubmissionReason } from '../../gen/gqlServer'
import { GraphQLError } from 'graphql'
import type {
    ContractPackageSubmissionWithCauseType,
    RateRevisionType,
} from '../../domain-models'

export function unlockedContractResolver(): Resolvers['UnlockedContract'] {
    return {
        initiallySubmittedAt(parent) {
            if (parent.packageSubmissions.length > 0) {
                const firstSubmission =
                    parent.packageSubmissions[
                        parent.packageSubmissions.length - 1
                    ]
                return firstSubmission.submitInfo.updatedAt
            }

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
    }
}
