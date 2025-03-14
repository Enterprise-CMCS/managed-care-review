import type { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import { packageName as generatePackageName } from '@mc-review/hpp'
import { formatCalendarDate } from '@mc-review/dates'
import {
    stripHTMLFromTemplate,
    generateCMSReviewerEmails,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import type { ProgramType, UpdateInfoType } from '../../domain-models'

export const unlockPackageCMSEmail = async (
    pkg: UnlockedHealthPlanFormDataType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateCMSReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )

    if (reviewerEmails instanceof Error) {
        return reviewerEmails
    }

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findPackagePrograms(pkg, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        pkg.stateCode,
        pkg.stateNumber,
        pkg.programIDs,
        packagePrograms
    )

    const isContractAndRates = pkg.submissionType === 'CONTRACT_AND_RATES'

    const data = {
        packageName,
        unlockedBy: updateInfo.updatedBy.email,
        unlockedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        unlockedReason: updateInfo.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateInfos:
            isContractAndRates &&
            pkg.rateInfos.map((rate) => ({
                rateName: rate.rateCertificationName,
            })),
    }

    const result = await renderTemplate<typeof data>(
        'unlockPackageCMSEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
