import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { Resolvers, SubmissionReason } from '../../gen/gqlServer'
import { GraphQLError } from 'graphql'
import type {
    ContractRevisionType,
    RatePackageSubmissionWithCauseType,
    RateType,
} from '../../domain-models'

// Return the date of the first submission for a rate
// This method relies on revisions always being presented in most-recent-first order
function initialSubmitDate(rate: RateType): Date | undefined {
    const firstSubmittedRev = rate.revisions[rate.revisions.length - 1]
    return firstSubmittedRev?.submitInfo?.updatedAt
}

export const rateResolver: Resolvers['Rate'] = {
    initiallySubmittedAt(parent) {
        return initialSubmitDate(parent) || null
    },
    state(parent) {
        const packageState = parent.stateCode
        const state = statePrograms.states.find(
            (st) => st.code === packageState
        )

        if (state === undefined) {
            const errMessage = 'State not found in database: ' + packageState
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
        const gqlSubs: RatePackageSubmissionWithCauseType[] = []
        for (let i = 0; i < parent.packageSubmissions.length; i++) {
            const thisSub = parent.packageSubmissions[i]
            let prevSub = undefined
            if (i < parent.packageSubmissions.length - 1) {
                prevSub = parent.packageSubmissions[i + 1]
            }

            // determine the cause for this submission
            let cause: SubmissionReason = 'RATE_SUBMISSION'

            if (
                !thisSub.submittedRevisions.find(
                    (r) => r.id === thisSub.rateRevision.id
                )
            ) {
                // not a rate submission, this rate wasn't in the submitted bits
                const connectedContractRevisionIDs =
                    thisSub.contractRevisions.map((r) => r.id)
                const submittedContract = thisSub.submittedRevisions.find((r) =>
                    connectedContractRevisionIDs.includes(r.id)
                )

                if (!submittedContract) {
                    cause = 'RATE_UNLINK'
                } else {
                    const thisSubmittedContract =
                        submittedContract as ContractRevisionType
                    if (!prevSub) {
                        throw new Error(
                            'Programming Error: a non-rate submission must have a previous rate submission'
                        )
                    }
                    const previousContractRevisionIDs =
                        prevSub.contractRevisions.map((r) => r.contract.id)
                    if (
                        previousContractRevisionIDs.includes(
                            thisSubmittedContract.contract.id
                        )
                    ) {
                        cause = 'CONTRACT_SUBMISSION'
                    } else {
                        cause = 'RATE_LINK'
                    }
                }
            }

            const gqlSub: RatePackageSubmissionWithCauseType = {
                cause,
                submitInfo: thisSub.submitInfo,
                submittedRevisions: thisSub.submittedRevisions,
                rateRevision: thisSub.rateRevision,
                contractRevisions: thisSub.contractRevisions,
            }

            gqlSubs.push(gqlSub)
        }

        return gqlSubs
    },
}
