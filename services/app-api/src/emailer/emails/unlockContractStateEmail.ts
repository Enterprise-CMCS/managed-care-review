import { packageName as generatePackageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    findContractPrograms,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'
import type { ProgramType, UpdateInfoType } from '../../domain-models'
import { reviewAndSubmitURL } from '../generateURLs'
import { pruneDuplicateEmails } from '../formatters'
import type { ContractType } from '../../domain-models'
export const unlockContractStateEmail = async (
    contract: ContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    submitterEmails: string[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const stateContactEmails: string[] = []
    const contractRev = contract.revisions[0]
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
        contractRev.contract.stateCode,
        contractRev.contract.stateNumber,
        contractRev.formData.programIDs,
        packagePrograms
    )

    const isContractAndRates =
        contractFormData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(contractRev.rateRevisions.length)

    const contractURL = reviewAndSubmitURL(contract.id, config.baseUrl)

    const data = {
        packageName,
        unlockedBy: updateInfo.updatedBy,
        unlockedOn: formatCalendarDate(updateInfo.updatedAt),
        unlockedReason: updateInfo.updatedReason,
        shouldIncludeRates:
            contractFormData.submissionType === 'CONTRACT_AND_RATES',
        rateInfos:
            isContractAndRates &&
            contractRev.rateRevisions.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
            })),
        submissionURL: contractURL,
    }

    const result = await renderTemplate<typeof data>(
        'unlockPackageStateEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            replyToAddresses: [config.helpDeskEmail],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked by CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
