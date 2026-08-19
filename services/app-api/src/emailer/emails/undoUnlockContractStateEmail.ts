import type {
    ContractType,
    ProgramType,
    UpdateInfoType,
} from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import {
    parseEmailDataUndoUnlockContract,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { formatEmailAddresses, pruneDuplicateEmails } from '../formatters'

export const undoUnlockContractStateEmail = async (
    contract: ContractType,
    updateInfo: UpdateInfoType,
    submitterEmails: string[],
    statePrograms: ProgramType[],
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []
    const contractRev = contract.packageSubmissions[0].contractRevision
    contractRev.formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    const undoUnlockContractData = parseEmailDataUndoUnlockContract(
        contract,
        updateInfo,
        statePrograms,
        config
    )
    if (undoUnlockContractData instanceof Error) {
        return undoUnlockContractData
    }

    const etaData = {
        ...undoUnlockContractData,
        cmsReviewHelpEmailAddress: formatEmailAddresses(
            config.cmsReviewHelpEmailAddress
        ),
        cmsRateHelpEmailAddress: formatEmailAddresses(
            config.cmsRateHelpEmailAddress
        ),
        helpDeskEmail: formatEmailAddresses(config.helpDeskEmail),
    }

    const template = await renderTemplate<typeof etaData>(
        'undoUnlockContractStateEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${etaData.packageName} unlock was undone by CMS`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
