import { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    stripHTMLFromTemplate,
    UpdatedEmailData,
    generateReviewerEmails,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'

export const unlockPackageCMSEmail = (
    submission: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    rateName: string,
    stateAnalystsEmails: StateAnalystsEmails
): EmailData => {
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateReviewerEmails(
        config,
        submission,
        stateAnalystsEmails
    )
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
