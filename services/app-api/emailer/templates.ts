import { URL } from 'url'

import {
    SubmissionType,
    StateSubmissionType,
    submissionName,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'
import { EmailData, EmailConfiguration } from './'

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const newPackageCMSEmailTemplate = (
    submission: StateSubmissionType,
    config: EmailConfiguration
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    return {
        toAddresses: ['mc-review-qa@truss.works'],
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${submissionName(submission)}`,
        bodyText: `${submissionName(submission)} was received from ${
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

const newPackageStateEmailTemplate = (
    submission: StateSubmissionType,
    user: CognitoUserType,
    config: EmailConfiguration
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    const currentUserEmail = user.email
    const receiverEmails: string[] = [currentUserEmail].concat(
        submission.stateContacts.map((contact) => contact.email)
    )
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }${submissionName(submission)} was sent to CMS`,
        bodyText: `${submissionName(submission)} was successfully submitted.

            View the full submission: ${submissionURL}
            
            If you need to make any changes, please contact CMS.
        
            What comes next:
            1. Check for completeness: CMS will review all documentation submitted to ensure all required materials were received.
            2. CMS review: Your submission will be reviewed by CMS for adherence to federal regulations. If a rate certification is included, it will be reviewed for policy adherence and actuarial soundness.
            3. Questions: You may receive questions via email form CMS as they conduct their reviews.
            4. Decision: Once all questions have been addressed, CMS will contact you with their final recommendation.`,
        bodyHTML: `
            ${submissionName(submission)} was successfully submitted.
            <br /><br />
            <a href="${submissionURL}">View the full submission</a>
            <br /><br />
            If you need to make any changes, please contact CMS.
            <br /><br />
            <div>What comes next:</div>
            <ol>
                <li>
                    <strong>Check for completeness:</strong> CMS will review all documentation submitted to ensure all required materials were received.
                </li>
                <li>
                    <strong>CMS review:</strong> Your submission will be reviewed by CMS for adherence to federal regulations. If a rate certification is included, it will be reviewed for policy adherence and actuarial soundness.
                </li>
                <li>
                    <strong>Questions:</strong> You may receive questions via email form CMS as they conduct their reviews.
                </li>
                <li>
                    <strong>Decision:</strong> Once all questions have been addressed, CMS will contact you with their final recommendation.

                </li>
            </ol>
        `,
    }
}

export { newPackageCMSEmailTemplate, newPackageStateEmailTemplate }

