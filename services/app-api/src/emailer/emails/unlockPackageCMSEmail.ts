import {
    generateRateName,
    UnlockedHealthPlanFormDataType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    stripHTMLFromTemplate,
    UpdatedEmailData,
    generateReviewerEmails,
    renderTemplate,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'

export const unlockPackageCMSEmail = async (
    pkg: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )

    const data = {
        packageName: unlockData.packageName,
        unlockedBy: unlockData.updatedBy,
        unlockedOn: formatCalendarDate(unlockData.updatedAt),
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
