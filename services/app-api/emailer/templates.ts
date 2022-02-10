import { URL } from 'url'
import dayjs from 'dayjs'
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

// Clean out HTML tags from an HTML based template
// this way we still have a text alternative for email client rendering html in plaintext
// plaintext is also referenced for unit testing
const stripHTMLFromTemplate = (template: string) => {
    let formatted = template
    // remove BR tags and replace them with line break
    formatted = formatted.replace(/<br>/gi, '\n')
    formatted = formatted.replace(/<br\s\/>/gi, '\n')
    formatted = formatted.replace(/<br\/>/gi, '\n')

    // remove P and A tags but preserve what's inside of them
    formatted = formatted.replace(/<p.*>/gi, '\n')
    formatted = formatted.replace(
        /<a.*href="(.*?)".*>(.*?)<\/a>/gi,
        ' $2 ($1)'
    )

    // everything else
   return formatted.replace(/(<([^>]+)>)/gi, '')
}

const newPackageCMSEmail = (
    submission: StateSubmissionType,
    config: EmailConfiguration
): EmailData => {
    // config
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = config.cmsReviewSharedEmails

    // template
    const contractEffectiveDatesText = `${
        submission.contractType === 'AMENDMENT'
            ? '<b>Contract amendment effective dates</b>'
            : '<b>Contract effective dates</b>'
    }: ${
        dayjs(submission.contractDateStart).format('MM/DD/YYYY') +
        ' to ' +
        dayjs(submission.contractDateEnd).format('MM/DD/YYYY')
    }`
    const ratingPeriodText= `${
        submission.rateType === 'NEW'
            ? '<b>Rating period</b>'
            : '<b>Rate amendment effective dates</b>'
    }`
    const ratingPeriodDates = `${
        submission.rateType === 'AMENDMENT' && submission.rateAmendmentInfo
            ? `${
                  dayjs(submission.rateAmendmentInfo.effectiveDateStart).format(
                      'MM/DD/YYYY'
                  ) +
                  ' to ' +
                  dayjs(submission.rateAmendmentInfo.effectiveDateEnd).format(
                      'MM/DD/YYYY'
                  )
              }`
            : `${
                  dayjs(submission.rateDateStart).format('MM/DD/YYYY') +
                  ' to ' +
                  dayjs(submission.rateDateEnd).format('MM/DD/YYYY')
              }`
    }`
    const rateRelatedDatesText = submission.submissionType === 'CONTRACT_AND_RATES' ? `${ratingPeriodText}: ${ratingPeriodDates}` : '' // displays nothing if submission is CONTRACT_ONLY
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    const bodyHTML = `<span style="color:#FF0000;font-weight:bold;">Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.</span>
            <br /><br />
            Managed Care submission: <b>${submissionName(
                submission
            )}</b> was received from <b>${submission.stateCode}</b>.<br /><br />
            <b>Submission type</b>: ${
                SubmissionTypeRecord[submission.submissionType]
            }<br />
            ${contractEffectiveDatesText}
            <br />
            ${rateRelatedDatesText}${rateRelatedDatesText.length > 0 ? '<br />' : ''}
            <b>Submission description</b>: ${
                submission.submissionDescription
            }<br /><br />
            <a href="${submissionURL}">View submission</a>
        `
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${
            isTestEnvironment ? `[${config.stage}] ` : ''
        }TEST New Managed Care Submission: ${submissionName(submission)}`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const newPackageStateEmail = (
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
    const bodyHTML =  `<span style="color:#FF0000;font-weight:bold;">Note: This submission is part of the MC-Review testing process. This is NOT an official submission and will only be used for testing purposes.</span>
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
        `
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }TEST ${submissionName(submission)} was sent to CMS`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

export { newPackageCMSEmail, newPackageStateEmail }

