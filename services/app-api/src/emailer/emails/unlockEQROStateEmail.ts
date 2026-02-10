import { packageName as generatePackageName } from '@mc-review/submissions'
import type {
    ContractType,
    ProgramType,
    UpdateInfoType,
} from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import {
    findContractPrograms,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { formatCalendarDate } from '@mc-review/dates'
import { submissionSummaryURL } from '../generateURLs'

type unlockEQROStateEmail = {
    pkgName: string
    unlockedBy: string
    unlockedOn: string
    unlockReason: string
    submissionURL: string
}

export const unlockEQROStateEmail = async (
    contract: ContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    submitterEmails: string[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const stateContactEmails: string[] = []
    const contractRev = contract.packageSubmissions[0].contractRevision

    const formData = contractRev.formData
    formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })

    const pkgPrograms = findContractPrograms(contractRev, statePrograms)
    if (pkgPrograms instanceof Error) {
        return pkgPrograms
    }

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    const pkgName = generatePackageName(
        contract.stateCode,
        contract.stateNumber,
        formData.programIDs,
        pkgPrograms
    )

    const submissionURL = submissionSummaryURL(
        contract.id,
        contract.contractSubmissionType,
        config.baseUrl
    )

    const etaData: unlockEQROStateEmail = {
        pkgName: pkgName,
        unlockedBy: updateInfo.updatedBy.email,
        unlockedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        unlockReason: updateInfo.updatedReason,
        submissionURL: submissionURL,
    }

    const template = await renderTemplate<unlockEQROStateEmail>(
        'unlockEQROStateEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses: toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${pkgName} was unlocked`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
