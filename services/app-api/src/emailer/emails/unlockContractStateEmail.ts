import { packageName as generatePackageName } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    findContractPrograms,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'
import type {
    ProgramType,
    UnlockedContractType,
    UpdateInfoType,
} from '../../domain-models'
import { reviewAndSubmitURL } from '../generateURLs'
import { pruneDuplicateEmails } from '../formatters'

type unlockHealthPlanEmail = {
    packageName: string
    unlockedBy: string
    unlockedOn: string
    unlockedReason: string
    shouldIncludeRates: boolean
    rateInfos: { rateName: string | undefined }[]
    submissionURL: string
}

type unlockEQROEmail = {
    packageName: string
    unlockedBy: string
    unlockedOn: string
    unlockedReason: string
    submissionURL: string
}

export const unlockContractStateEmail = async (
    contract: UnlockedContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    submitterEmails: string[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const stateContactEmails: string[] = []

    const contractRev = contract.draftRevision
    const rateRevs = contract.draftRates.map((rate) => {
        if (rate.draftRevision) {
            return rate.draftRevision
        } else {
            return rate.packageSubmissions[0].rateRevision
        }
    })

    const contractFormData = contractRev.formData
    contractFormData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

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

    const contractURL = reviewAndSubmitURL(
        contractRev.contract.id,
        contract.contractSubmissionType,
        config.baseUrl
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
                contractFormData.submissionType === 'CONTRACT_AND_RATES',
            rateInfos: rateRevs.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
            })),
            submissionURL: contractURL,
        }

        const healthPlanTemplate = await renderTemplate<unlockHealthPlanEmail>(
            'unlockContractStateEmail',
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
            submissionURL: contractURL,
        }

        const eqroTemplate = await renderTemplate<unlockEQROEmail>(
            'unlockContractStateEmail',
            eqroEtaData
        )

        emailTemplate = eqroTemplate
    }

    if (emailTemplate instanceof Error) {
        return emailTemplate
    } else {
        return {
            toAddresses: receiverEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked by CMS`,
            bodyText: stripHTMLFromTemplate(emailTemplate),
            bodyHTML: emailTemplate,
        }
    }
}
