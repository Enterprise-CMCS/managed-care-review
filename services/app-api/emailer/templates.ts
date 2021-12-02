import { URL } from 'url'

import {
    SubmissionType,
    StateSubmissionType,
    submissionName,
} from '../../app-web/src/common-code/domain-models'
import { EmailData, EmailConfiguration } from './'

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const newSubmissionCMSEmailTemplate = (
    submission: StateSubmissionType,
    config: EmailConfiguration
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    const isTestEnvironment = config.stage !== 'prod'

    const reviewerEmails = isTestEnvironment
        ? ['mc-review-qa@truss.works']
        : config.cmsReviewersSharedEmail.split(',')

    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${
            isTestEnvironment ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${submissionName(submission)}`,
        bodyText: `
            ${submissionName(submission)} was received from ${
            submission.stateCode
        }.

            Submission type: ${SubmissionTypeRecord[submission.submissionType]}
            Submission description: ${submission.submissionDescription}

            View the full submission: ${submissionURL}`,
        bodyHTML: `
            ${submissionName(submission)} was received from ${
            submission.stateCode
        }.<br /><br />
            Submission type: ${
                SubmissionTypeRecord[submission.submissionType]
            }<br />
            Submission description: ${
                submission.submissionDescription
            }<br /><br />
            <a href="${submissionURL}">View the full submission</a>
        `,
    }
}

export { newSubmissionCMSEmailTemplate }
