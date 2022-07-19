import {
    generateRateName,
    UnlockedHealthPlanFormDataType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    stripHTMLFromTemplate,
    UpdatedEmailData,
    generateCMSReviewerEmails,
    renderTemplate,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import { formatDateTime } from 'app-web/src/common-code/dateHelpers/calendarDate'

export const unlockPackageCMSEmail = async (
    pkg: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateCMSReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )

    const data = {
        packageName: unlockData.packageName,
        unlockedBy: unlockData.updatedBy,
        unlockedOn: formatDateTime(unlockData.updatedAt),
        unlockedReason: unlockData.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateName: generateRateName(pkg, unlockData.packageName),
    }

    const result = await renderTemplate<typeof data>(
        'unlockPackageCMSEmail',
        data,
        isUnitTest
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${
                unlockData.packageName
            } was unlocked`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
