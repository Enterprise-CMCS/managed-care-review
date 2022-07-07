import { URL } from 'url'

import { LockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { EmailConfiguration, EmailData } from '..'
import { generateRateName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { UserType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    renderTemplate,
} from '../templateHelpers'

export const newPackageStateEmail = async (
    pkg: LockedHealthPlanFormDataType,
    packageName: string,
    user: UserType,
    config: EmailConfiguration
): Promise<EmailData> => {
    const currentUserEmail = user.email
    const receiverEmails: string[] = [currentUserEmail].concat(
        pkg.stateContacts.map((contact) => contact.email)
    )

    const hasRateAmendmentInfo =
        pkg.rateType === 'AMENDMENT' && pkg.rateAmendmentInfo

    const data = {
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        cmsReviewHelpEmailAddress: config.cmsReviewHelpEmailAddress,
        cmsRateHelpEmailAddress: config.cmsRateHelpEmailAddress,
        cmsDevTeamHelpEmailAddress: config.cmsDevTeamHelpEmailAddress,
        packageName: packageName,
        submissionType: SubmissionTypeRecord[pkg.submissionType],
        submissionDescription: pkg.submissionDescription,
        contractDatesLabel:
            pkg.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(pkg.contractDateStart),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd),
        rateName: generateRateName(pkg, packageName),
        rateDateLabel:
            pkg.rateType === 'NEW'
                ? 'Rating period'
                : 'Rate amendment effective dates',
        rateDatesStart: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateStart)
            : formatCalendarDate(pkg.rateDateStart),
        rateDatesEnd: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateEnd)
            : formatCalendarDate(pkg.rateDateEnd),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    try {
        const bodyHTML = await renderTemplate<typeof data>(
            './newPackageStateEmail',
            data
        )

        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${packageName} was sent to CMS`,
            bodyText: stripHTMLFromTemplate(bodyHTML),
            bodyHTML: bodyHTML,
        }
    } catch (err) {
        throw new Error(err)
    }
}
