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
    return {
        toAddresses: ['mc-review-qa@truss.works'],
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${submissionName(submission)}`,
        bodyText: `
            ${submissionName(submission)} was received from ${
            submission.stateCode
        }.

            Submission type: ${SubmissionTypeRecord[submission.submissionType]}
            Submission description: ${submission.submissionDescription}

            View the full submission: ${config.baseUrl}/submissions/${
            submission.id
        }
        `,
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
            <a href="${config.baseUrl}/submissions/${
            submission.id
        }">View the full submission</a>
        `,
    }
}

export { newSubmissionCMSEmailTemplate }
