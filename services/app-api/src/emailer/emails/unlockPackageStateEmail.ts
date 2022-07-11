import { URL } from 'url'

import { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { generateRateName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { stripHTMLFromTemplate, UpdatedEmailData } from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'

export const unlockPackageStateEmail = (
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
