import { SubmissionType, StateSubmissionType } from "../../app-web/src/common-code/domain-models"
import { EmailData, EmailConfiguration } from './'

// TODO: move to common-code - lang records for relevant enums - this should match code in app-web constants/submission.ts (should this be moved to common-code?)
const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

// TODO: move to common-code - get submission name - this should match code in app-web stateSubmissionResolver (should this be moved to common-code?)
const generateSubmissionName = (sub: StateSubmissionType): string => {
    const padNumber = sub.stateNumber.toString().padStart(4, '0')
    return `${sub.stateCode.toUpperCase()}-${sub.programID.toUpperCase()}-${padNumber}`
}

const submissionReceivedCMSEmail = (
    submission: StateSubmissionType,
    config: EmailConfiguration
): EmailData => {
    return {
        toAddresses: ['hana@truss.works'],
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${generateSubmissionName(submission)}`,
        bodyText: `
            ${generateSubmissionName(submission)} was received from ${
            submission.stateCode
        }.

            Submission type: ${SubmissionTypeRecord[submission.submissionType]}
            Submission description: ${submission.submissionDescription}

            View the full submission: ${config.baseUrl}/submissions/${
            submission.id
        }
        `,
        bodyHTML: `
            ${generateSubmissionName(submission)} was received from ${
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




export {submissionReceivedCMSEmail}
