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
    const isTestEnvironment = config.stage !== 'prod'

    const reviewerEmails = config.cmsReviewSharedEmails

    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${
            isTestEnvironment ? `[${config.stage}] ` : ''
        }TEST New Managed Care Submission: ${submissionName(submission)}`,
        bodyText: `Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.
        ${submissionName(submission)} was received from ${submission.stateCode}.

            Submission type: ${SubmissionTypeRecord[submission.submissionType]}
            Submission description: ${submission.submissionDescription}

            View submission: ${submissionURL}`,
        bodyHTML: `
<<<<<<< HEAD
            <span style="color:#FF0000",font-weight:"bold">Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.</span>
=======
            <span style="color:#FF0000">Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.</span>
>>>>>>> origin/main
            <br /><br />
            ${submissionName(submission)} was received from ${
            submission.stateCode
        }.<br /><br />
            Submission type: ${
                SubmissionTypeRecord[submission.submissionType]
            }<br />
            Submission description: ${
                submission.submissionDescription
            }<br /><br />
            <a href="${submissionURL}">View submission</a>
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
        }TEST ${submissionName(submission)} was sent to CMS`,
        bodyText: `Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.

            ${submissionName(submission)} was successfully submitted.
        
            View submission: ${submissionURL}
            
            If you need to make any changes, please contact CMS.
        
            What comes next:
            1. Check for completeness: CMS will review all documentation submitted to ensure all required materials were received.
            2. CMS review: Your submission will be reviewed by CMS for adherence to federal regulations. If a rate certification is included, it will be reviewed for policy adherence and actuarial soundness.
            3. Questions: You may receive questions via email from CMS as they conduct their review.
            4. Decision: Once all questions have been addressed, CMS will contact you with their final recommendation.`,
        bodyHTML: `
<<<<<<< HEAD
            <span style="color:#FF0000",font-weight:"bold">Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.</span>
=======
            <span style="color:#FF0000">Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.</span>
>>>>>>> origin/main
            <br /><br />
             ${submissionName(submission)} was successfully submitted.
            <br /><br />
            <a href="${submissionURL}">View submission</a>
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
                    <strong>Questions:</strong> You may receive questions via email from CMS as they conduct their review.
                </li>
                <li>
                    <strong>Decision:</strong> Once all questions have been addressed, CMS will contact you with their final recommendation.

                </li>
            </ol>
        `,
    }
}

export { newPackageCMSEmailTemplate, newPackageStateEmailTemplate }

