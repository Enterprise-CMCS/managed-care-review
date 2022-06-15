import { URL } from 'url'
import {
    LockedHealthPlanFormDataType,
    SubmissionType,
    UnlockedHealthPlanFormDataType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { UserType } from '../domain-models'
import { formatCalendarDate } from '../../../app-web/src/common-code/dateHelpers'
import { EmailConfiguration, EmailData } from './'
import { generateRateName } from '../../../app-web/src/common-code/healthPlanFormDataType'

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
    formatted = formatted.replace(/<a.*href="(.*?)".*>(.*?)<\/a>/gi, ' $2 ($1)')

    // everything else
    return formatted.replace(/(<([^>]+)>)/gi, '')
}

const generateReviewerEmails = (
    config: EmailConfiguration,
    submission: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType
): string[] => {
    if (
        submission.submissionType === 'CONTRACT_AND_RATES' &&
        submission.stateCode !== 'PR'
    ) {
        return [
            ...config.cmsReviewSharedEmails,
            ...config.ratesReviewSharedEmails,
        ]
    }
    return config.cmsReviewSharedEmails
}

const generateNewSubmissionBody = (
    submission: LockedHealthPlanFormDataType,
    submissionName: string,
    config: EmailConfiguration
): string => {
    // template
    const contractEffectiveDatesText = `${
        submission.contractType === 'AMENDMENT'
            ? '<b>Contract amendment effective dates</b>'
            : '<b>Contract effective dates</b>'
    }: ${
        formatCalendarDate(submission.contractDateStart) +
        ' to ' +
        formatCalendarDate(submission.contractDateEnd)
    }`
    const ratingPeriodText = `${
        submission.rateType === 'NEW'
            ? '<b>Rating period</b>'
            : '<b>Rate amendment effective dates</b>'
    }`
    const ratingPeriodDates = `${
        submission.rateType === 'AMENDMENT' && submission.rateAmendmentInfo
            ? `${
                  formatCalendarDate(
                      submission.rateAmendmentInfo.effectiveDateStart
                  ) +
                  ' to ' +
                  formatCalendarDate(
                      submission.rateAmendmentInfo.effectiveDateEnd
                  )
              }`
            : submission.rateDateStart && submission.rateDateEnd
            ? `${
                  formatCalendarDate(submission.rateDateStart) +
                  ' to ' +
                  formatCalendarDate(submission.rateDateEnd)
              }`
            : 'Rating Period Dates Not Found'
    }`

    const rateName =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  submissionName
              )}<br />`
            : ''
    const rateRelatedDatesText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `${ratingPeriodText}: ${ratingPeriodDates}`
            : '' // displays nothing if submission is CONTRACT_ONLY
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href

    return `
        <b>Submission type</b>: ${
            SubmissionTypeRecord[submission.submissionType]
        }
        <br />
        ${contractEffectiveDatesText}
        <br />
        ${rateName}
        ${rateRelatedDatesText}${
        rateRelatedDatesText.length > 0 ? '<br />' : ''
    }
        <b>Submission description</b>: ${submission.submissionDescription}
        <br />
        <br />
        <a href="${submissionURL}">View submission</a>
    `
}

const newPackageCMSEmail = (
    submission: LockedHealthPlanFormDataType,
    submissionName: string,
    config: EmailConfiguration
): EmailData => {
    // config
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateReviewerEmails(config, submission)
    const bodyHTML = `Managed Care submission: <b>${submissionName}</b> was received from <b>${
        submission.stateCode
    }</b>.
            <br />
            <br />
            ${generateNewSubmissionBody(submission, submissionName, config)}
        `
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${
            isTestEnvironment ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${submissionName}`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const newPackageStateEmail = (
    submission: LockedHealthPlanFormDataType,
    submissionName: string,
    user: UserType,
    config: EmailConfiguration
): EmailData => {
    const currentUserEmail = user.email
    const receiverEmails: string[] = [currentUserEmail].concat(
        submission.stateContacts.map((contact) => contact.email)
    )
    const bodyHTML = `${submissionName} was successfully submitted.
            <br /><br />
            ${generateNewSubmissionBody(submission, submissionName, config)}
            <br /><br />
            If you need to make any changes, please contact CMS.
            <br /><br />
            <div>What comes next:</div>
            <ol>
                <li>
                    <strong>Check for completeness:</strong> CMS will review all documentation submitted to ensure all required materials were received.
                </li>
                <li>
                    <strong>CMS review:</strong> Your submission will be reviewed by CMS for adherence to federal regulations.
                </li>
                <li>
                    <strong>Questions:</strong> You may receive questions via email from CMS as they conduct their review.
                </li>
                <li>
                    <strong>Decision:</strong> Once all questions have been addressed, CMS will contact you with their final recommendation.

                </li>
                <li>
                If you need assistance or to make changes to your submission: 
                    <li>
                        For assistance with programmatic, contractual, or operational issues, please reach out to ${
                            config.cmsReviewHelpEmailAddress
                        } and/or your CMS primary contact.
                    </li>
                    <li>
                        For assistance on policy and actuarial issues, please reach out to ${
                            config.cmsRateHelpEmailAddress
                        }.
                    </li>
                    <li>
                        For issues related to MC-Review or all other inquiries, please reach out to ${
                            config.cmsDevTeamHelpEmailAddress
                        }.
                    </li>
                </li>
            </ol>
        `
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }${submissionName} was sent to CMS`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

type UpdatedEmailData = {
    packageName: string
    updatedBy: string
    updatedAt: Date
    updatedReason: string
}

const unlockPackageCMSEmail = (
    submission: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    rateName: string
): EmailData => {
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateReviewerEmails(config, submission)
    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${rateName}<br />`
            : ''

    const bodyHTML = `Submission ${unlockData.packageName} was unlocked<br />
        <br />
        <b>Unlocked by:</b> ${unlockData.updatedBy}<br />
        <b>Unlocked on:</b> ${formatCalendarDate(unlockData.updatedAt)}<br />
        <b>Reason for unlock:</b> ${unlockData.updatedReason}<br /><br />
        ${rateNameText}
        You will receive another notification when the state resubmits.
    `
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${
            unlockData.packageName
        } was unlocked`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const unlockPackageStateEmail = (
    submission: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    submissionName: string
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}/review-and-submit`,
        config.baseUrl
    ).href
    const receiverEmails: string[] = submission.stateContacts.map(
        (contact) => contact.email
    )

    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  submissionName
              )}<br />`
            : ''

    const bodyHTML = `Submission ${
        unlockData.packageName
    } was unlocked by CMS<br />
        <br />
        <b>Unlocked by:</b> ${unlockData.updatedBy}<br />
        <b>Unlocked on:</b> ${formatCalendarDate(unlockData.updatedAt)}<br />
        <b>Reason for unlock:</b> ${unlockData.updatedReason}<br /><br />
        ${rateNameText}
        <b>You must revise the submission before CMS can continue reviewing it.<br />
        <a href="${submissionURL}">Open the submission in MC-Review to make edits.</a>
    `
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${config.stage !== 'prod' ? `[${config.stage}] ` : ''}${
            unlockData.packageName
        } was unlocked by CMS`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const resubmittedStateEmail = (
    submission: LockedHealthPlanFormDataType,
    user: UserType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration
): EmailData => {
    const currentUserEmail = user.email
    const receiverEmails: string[] = [currentUserEmail].concat(
        submission.stateContacts.map((contact) => contact.email)
    )

    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  resubmittedData.packageName
              )}<br />`
            : ''

    const bodyHTML = `Submission ${
        resubmittedData.packageName
    } was successfully resubmitted<br />
        <br />
        <b>Submitted by:</b> ${resubmittedData.updatedBy}<br />
        <b>Updated on:</b> ${formatCalendarDate(
            resubmittedData.updatedAt
        )}<br />
        <b>Changes made:</b> ${resubmittedData.updatedReason}<br />
        ${rateNameText}
        <br />
        <p>If you need to make any further changes, please contact CMS.</p>
    `
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${config.stage !== 'prod' ? `[${config.stage}] ` : ''}${
            resubmittedData.packageName
        } was resubmitted`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const resubmittedCMSEmail = (
    submission: LockedHealthPlanFormDataType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration
): EmailData => {
    const reviewerEmails = generateReviewerEmails(config, submission)
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  resubmittedData.packageName
              )}<br />`
            : ''

    const bodyHTML = `The state completed their edits on submission ${
        resubmittedData.packageName
    }<br />
        <br />
        <b>Submitted by:</b> ${resubmittedData.updatedBy}<br />
        <b>Updated on:</b> ${formatCalendarDate(
            resubmittedData.updatedAt
        )}<br />
        <b>Changes made:</b> ${resubmittedData.updatedReason}<br />
        ${rateNameText}
        <br />
        <a href="${submissionURL}">View submission</a>
    `
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${config.stage !== 'prod' ? `[${config.stage}] ` : ''}${
            resubmittedData.packageName
        } was resubmitted`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

export {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedStateEmail,
    resubmittedCMSEmail,
    UpdatedEmailData,
}
