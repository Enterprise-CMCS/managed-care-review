import { formatCalendarDate } from '@mc-review/common-code'
import type { ContractRevisionWithRatesType } from '../../domain-models'
import { packageName as generatePackageName } from '@mc-review/hpp'

import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
    generateCMSReviewerEmailsForContract,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import type { ProgramType, UpdateInfoType } from '../../domain-models'

export const unlockContractCMSEmail = async (
    contractRev: ContractRevisionWithRatesType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateCMSReviewerEmailsForContract(
        config,
        contractRev,
        stateAnalystsEmails
    )

    if (reviewerEmails instanceof Error) {
        return reviewerEmails
    }

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findContractPrograms(contractRev, statePrograms)
    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        contractRev.contract.stateCode,
        contractRev.contract.stateNumber,
        contractRev.formData.programIDs,
        packagePrograms
    )

    const isContractAndRates =
        contractRev.formData.submissionType === 'CONTRACT_AND_RATES'

    const data = {
        packageName,
        unlockedBy: updateInfo.updatedBy.email,
        unlockedOn: formatCalendarDate(updateInfo.updatedAt),
        unlockedReason: updateInfo.updatedReason,
        shouldIncludeRates:
            contractRev.formData.submissionType === 'CONTRACT_AND_RATES',
        rateInfos:
            isContractAndRates &&
            contractRev.rateRevisions.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
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
            replyToAddresses: [config.helpDeskEmail],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
