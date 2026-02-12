import { formatCalendarDate } from '@mc-review/dates'
import type {
    UnlockedContractType,
    ProgramType,
    UpdateInfoType,
} from '../../domain-models'
import { packageName as generatePackageName } from '@mc-review/submissions'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
    generateCMSReviewerEmailsForUnlockedContract,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import type {
    unlockHealthPlanEmail,
    unlockEQROEmail,
} from './unlockContractStateEmail'

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

    //Both EQRO and health plans use the same eta template but diff data, we can handle that here.
    let emailTemplate
    if (contract.contractSubmissionType === 'HEALTH_PLAN') {
        const healthPlanEtaData: unlockHealthPlanEmail = {
            packageName,
            unlockedBy: updateInfo.updatedBy.email,
            unlockedOn: formatCalendarDate(
                updateInfo.updatedAt,
                'America/Los_Angeles'
            ),
            unlockedReason: updateInfo.updatedReason,
            shouldIncludeRates:
                contractRev.formData.submissionType === 'CONTRACT_AND_RATES',
            rateInfos: rateRevs.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
            })),
        }

        const healthPlanTemplate = await renderTemplate<unlockHealthPlanEmail>(
            'unlockContractCMSEmail',
            healthPlanEtaData
        )

        emailTemplate = healthPlanTemplate
    } else {
        const eqroEtaData: unlockEQROEmail = {
            packageName,
            unlockedBy: updateInfo.updatedBy.email,
            unlockedOn: formatCalendarDate(
                updateInfo.updatedAt,
                'America/Los_Angeles'
            ),
            unlockedReason: updateInfo.updatedReason,
        }

        const eqroTemplate = await renderTemplate<unlockEQROEmail>(
            'unlockContractCMSEmail',
            eqroEtaData
        )

        emailTemplate = eqroTemplate
    }

    if (emailTemplate instanceof Error) {
        return emailTemplate
    } else {
        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked`,
            bodyText: stripHTMLFromTemplate(emailTemplate),
            bodyHTML: emailTemplate,
        }
    }
}
