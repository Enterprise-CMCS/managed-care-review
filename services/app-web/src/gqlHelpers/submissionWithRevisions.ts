import { base64ToDomain } from '../common-code/proto/stateSubmission'
import { submissionName, SubmissionUnionType } from '../common-code/domain-models'
import {  Submission2, Submission as GQLSubmissionUnionType} from '../gen/gqlClient'


const isGQLDraftSubmission = (sub: GQLSubmissionUnionType): boolean => {
    return sub.__typename === 'DraftSubmission'
}

const getCurrentRevisionFromSubmission2 = (submissionAndRevisions?: Submission2 | null): SubmissionUnionType | Error => {
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
            return healthPlanPackageFormDataResult
        }
    } else {
        console.error('ERROR: no submission exists')
        return new Error('Error fetching the submission. Please try again.')
    }

    }
    
const convertDomainModelFormDataToGQLSubmission = (submissionDomainModel: SubmissionUnionType): GQLSubmissionUnionType => {
    // convert from domain model back into GQL types
    const GQLSubmission: GQLSubmissionUnionType =
        submissionDomainModel.status === 'DRAFT'
            ? {
                  ...submissionDomainModel,

                  __typename: 'DraftSubmission' as const,
                  name: submissionName(submissionDomainModel),
                  program: {
                      id: 'bogs-id',
                      name: 'bogus-program',
                  },
              }
            : {
                  ...submissionDomainModel,
                  __typename: 'StateSubmission' as const,
                  name: submissionName(submissionDomainModel),
                  program: {
                      id: 'bogs-id',
                      name: 'bogus-program',
                  },
                  submittedAt:submissionDomainModel.submittedAt
              }

    return GQLSubmission
}

export {
    convertDomainModelFormDataToGQLSubmission,
    getCurrentRevisionFromSubmission2,
    isGQLDraftSubmission, 
}

export type {GQLSubmissionUnionType}
