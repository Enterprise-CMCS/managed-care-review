import { formatCalendarDate } from '@mc-review/common-code'
import type { UnlockedContractType } from '../../domain-models'
import { packageName as generatePackageName } from '@mc-review/hpp'

import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
    generateCMSReviewerEmailsForUnlockedContract,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import type { ProgramType, UpdateInfoType } from '../../domain-models'

export const unlockContractCMSEmail = async (
    contract: UnlockedContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const contractRev = contract.draftRevision
    const rateRevs = contract.draftRates.map((rate) => {
        if (rate.draftRevision) {
            return rate.draftRevision
        } else {
            return rate.packageSubmissions[0].rateRevision
        }
    })

    const reviewerEmails = generateCMSReviewerEmailsForUnlockedContract(
        config,
        contract,
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
        contract.stateCode,
        contract.stateNumber,
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
            rateRevs.map((rate) => ({
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
