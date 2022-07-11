import {
    LockedHealthPlanFormDataType,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { UserType } from '../../domain-models'
import { stripHTMLFromTemplate, UpdatedEmailData } from '../templateHelpers'

import type { EmailData, EmailConfiguration } from '../'

export const resubmitPackageStateEmail = (
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
