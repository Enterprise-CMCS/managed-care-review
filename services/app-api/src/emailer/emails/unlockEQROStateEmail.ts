import { packageName as generatePackageName } from '@mc-review/submissions'
import type {
    ProgramType,
    UnlockedContractType,
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
    packageName: string
    unlockedBy: string
    unlockedOn: string
    unlockedReason: string
    submissionURL: string
}

export const unlockEQROStateEmail = async (
    contract: UnlockedContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    submitterEmails: string[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const stateContactEmails: string[] = []
    const contractRev = contract.draftRevision

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
        packageName: pkgName,
        unlockedBy: updateInfo.updatedBy.email,
        unlockedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        unlockedReason: updateInfo.updatedReason,
        submissionURL: submissionURL,
    }

    const template = await renderTemplate<unlockEQROStateEmail>(
        'unlockContractStateEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses: toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${pkgName} was unlocked by CMS`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
