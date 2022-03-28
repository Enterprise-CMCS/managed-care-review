import { submissionName, SubmissionUnionType, ProgramT } from '../common-code/domain-models'
import { base64ToDomain } from '../common-code/proto/stateSubmission'
import { Revision, Submission as GQLSubmissionUnionType, Submission2 } from '../gen/gqlClient'


const isGQLDraftSubmission = (sub: GQLSubmissionUnionType): boolean => {
    return sub.__typename === 'DraftSubmission'
}

const getCurrentRevisionFromSubmission2 = (submissionAndRevisions: Submission2): [Revision, SubmissionUnionType] | Error => {
    // check that package and valid revisions exist
    if (submissionAndRevisions) {
        if (
            !submissionAndRevisions.revisions ||
            submissionAndRevisions.revisions.length < 1
        ) {
            console.error(
                'ERROR: submission in summary has no submitted revision',
                submissionAndRevisions.revisions
            )
            return new Error(
                'Error fetching the latest revision. Please try again.'
            )
        }

        const newestRev = submissionAndRevisions.revisions.reduce(
            (acc, rev) => {
                if (rev.revision.createdAt > acc.revision.createdAt) {
                    return rev
                } else {
                    return acc
                }
            }
        ).revision

        // Decode form data submitted by the state
        const healthPlanPackageFormDataResult = base64ToDomain(
            newestRev.submissionData
        )
        if (healthPlanPackageFormDataResult instanceof Error) {
            console.error(
                'ERROR: got a proto decoding error',
                healthPlanPackageFormDataResult
            )
            return new Error('Error decoding the submission. Please try again.')
        } else {
            return [newestRev, healthPlanPackageFormDataResult]
        }
    } else {
        console.error('ERROR: no submission exists')
        return new Error('Error fetching the submission. Please try again.')
    }

}

const convertDomainModelFormDataToGQLSubmission = (submissionDomainModel: SubmissionUnionType, statePrograms: ProgramT[]): GQLSubmissionUnionType => {
    // convert from domain model back into GQL types
    const GQLSubmission: GQLSubmissionUnionType =
        submissionDomainModel.status === 'DRAFT'
            ? {
                  ...submissionDomainModel,

                  __typename: 'DraftSubmission' as const,
                  name: submissionName(submissionDomainModel, statePrograms),
              }
            : {
                  ...submissionDomainModel,
                  __typename: 'StateSubmission' as const,
                  name: submissionName(submissionDomainModel, statePrograms),
                  submittedAt:submissionDomainModel.submittedAt
              }

    return GQLSubmission
}

export {
    convertDomainModelFormDataToGQLSubmission,
    getCurrentRevisionFromSubmission2,
    isGQLDraftSubmission,
}
export type { GQLSubmissionUnionType }


