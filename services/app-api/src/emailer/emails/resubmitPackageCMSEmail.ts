import {
    LockedHealthPlanFormDataType,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    stripHTMLFromTemplate,
    UpdatedEmailData,
    generateReviewerEmails,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'

export const resubmitPackageCMSEmail = (
    submission: LockedHealthPlanFormDataType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails
): EmailData => {
    const reviewerEmails = generateReviewerEmails(
        config,
        submission,
        stateAnalystsEmails
    )
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
