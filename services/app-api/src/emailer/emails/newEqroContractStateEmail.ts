import {
    eqroValidationAndReviewDetermination,
    packageName as generatePackageName,
    ManagedCareEntityRecord,
} from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import type { ContractType, ProgramType } from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import {
    findContractPrograms,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { submissionSummaryURL } from '../generateURLs'

type newEQROContractStateEmail = {
    contractName: string
    contractType: string
    actionType: string
    amendmentDateStart: string //mm/dd/yy
    amendmentDateEnd: string //mm/dd/yy
    managedCareEntities: string
    submissionDescription: string
    submissionURL: string
    subjectToReview: boolean
}

export const newEqroContractStateEmail = async (
    contract: ContractType,
    submitterEmails: string[],
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []
    const contractRev = contract.packageSubmissions[0].contractRevision
    const formData = contractRev.formData

    formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    const pkgPrograms = findContractPrograms(contractRev, statePrograms)
    if (pkgPrograms instanceof Error) {
        return pkgPrograms
    }

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

    const subjectToReview = eqroValidationAndReviewDetermination(
        contract.id,
        formData
    )
    if (subjectToReview instanceof Error) {
        return subjectToReview
    }

    const etaData: newEQROContractStateEmail = {
        contractName: pkgName,
        contractType: 'External Quality Review Organization (EQRO)',
        actionType:
            formData.contractType === 'BASE'
                ? 'Base contract'
                : 'Amendment to base contract',
        amendmentDateStart: formatCalendarDate(
            formData.contractDateStart,
            'America/Los_Angeles'
        ),
        amendmentDateEnd: formatCalendarDate(
            formData.contractDateEnd,
            'America/Los_Angeles'
        ),
        managedCareEntities: formData.managedCareEntities
            .map((entity) => ManagedCareEntityRecord[entity])
            .join(', '),
        submissionDescription: formData.submissionDescription,
        submissionURL: submissionURL,
        subjectToReview: subjectToReview,
    }

    const template = await renderTemplate<newEQROContractStateEmail>(
        'newEqroContractStateEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses: toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${pkgName} is ${subjectToReview ? '' : 'not '}subject to CMS review and approval`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
