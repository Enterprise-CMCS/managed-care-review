import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
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

    const isContractAndRates =
        contractFormData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(rateRevs.length)

    const contractURL = reviewAndSubmitURL(
        contractRev.contract.id,
        config.baseUrl
    )

    const data = {
        packageName,
        unlockedBy: updateInfo.updatedBy.email,
        unlockedOn: formatCalendarDate(updateInfo.updatedAt),
        unlockedReason: updateInfo.updatedReason,
        shouldIncludeRates:
            contractFormData.submissionType === 'CONTRACT_AND_RATES',
        rateInfos:
            isContractAndRates &&
            rateRevs.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
            })),
        submissionURL: contractURL,
    }

    const result = await renderTemplate<typeof data>(
        'unlockContractStateEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked by CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
