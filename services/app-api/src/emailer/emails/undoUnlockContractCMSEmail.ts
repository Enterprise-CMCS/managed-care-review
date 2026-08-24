import type {
    ContractType,
    ProgramType,
    UpdateInfoType,
} from '../../domain-models'
import type {
    EmailConfiguration,
    EmailData,
    StateAnalystsEmails,
} from '../emailer'
import {
    parseEmailDataUndoUnlockContract,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { pruneDuplicateEmails } from '../formatters'

export const undoUnlockContractCMSEmail = async (
    contract: ContractType,
    updateInfo: UpdateInfoType,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[],
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const toAddresses = pruneDuplicateEmails([
        ...stateAnalystsEmails,
        ...config.dmcoEmails,
        ...config.devReviewTeamEmails,
    ])

    const etaData = parseEmailDataUndoUnlockContract(
        contract,
        updateInfo,
        statePrograms,
        config
    )
    if (etaData instanceof Error) {
        return etaData
    }

    const template = await renderTemplate<typeof etaData>(
        'undoUnlockContractCMSEmail',
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
