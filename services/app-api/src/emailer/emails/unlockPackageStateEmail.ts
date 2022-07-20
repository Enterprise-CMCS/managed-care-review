import { URL } from 'url'

import { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { generateRateName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    UpdatedEmailData,
    generateStateReceiverEmails,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'
import { formatDateTime } from '../../../../app-web/src/common-code/dateHelpers/calendarDate'

export const unlockPackageStateEmail = async (
    pkg: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const receiverEmails = generateStateReceiverEmails(pkg)

    const data = {
        packageName: unlockData.packageName,
        unlockedBy: unlockData.updatedBy,
        unlockedOn: formatDateTime(unlockData.updatedAt),
        unlockedReason: unlockData.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateName: generateRateName(pkg, unlockData.packageName),
        submissionURL: new URL(
            `submissions/${pkg.id}/review-and-submit`,
            config.baseUrl
        ).href,
    }

    const result = await renderTemplate<typeof data>(
        'unlockPackageStateEmail',
        data,
        isUnitTest
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${
                unlockData.packageName
            } was unlocked by CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
