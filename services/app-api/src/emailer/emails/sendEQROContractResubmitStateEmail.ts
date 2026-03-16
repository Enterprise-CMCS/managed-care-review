import {
    eqroValidationAndReviewDetermination,
    eqroReviewDeterminationChanged,
    packageName as generatePackageName,
} from '@mc-review/submissions'
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
import { submissionSummaryURL } from '../generateURLs'
import { formatCalendarDate } from '@mc-review/dates'

export type ResubmitEQROTemplateData = {
    pkgName: string
    emailHeader: string
    submittedBy: string
    updatedOn: string //mm/dd/yy
    subjectToReview: boolean
    reviewDeterminationChanged: boolean
    changeSummary: string
    submissionURL: string
    MCGDMCOContactEmail?: string
    managedCareEntities?: string | undefined
    eqroNewContractor?: string | undefined
    eqroProvisionMcoEqrOrRelatedActivities?: string | undefined
    eqroProvisionMcoNewOptionalActivity?: string | undefined
    eqroProvisionNewMcoEqrRelatedActivities?: string | undefined
    eqroProvisionChipEqrRelatedActivities?: string | undefined
}

/*
 * emailHeader logic:
 * Not subject to review ➔ Subject to review:  ‘is now subject to review’
 * Subject to review ➔ Not subject to review:  ‘is no longer subject to review’
 * No change: ‘was resubmitted’
 */
export const resubmitEQROHeader = (
    reviewDeterminationChanged: boolean,
    subjectToReview: boolean
): string => {
    const emailHeader = reviewDeterminationChanged
        ? subjectToReview
            ? 'is now subject to review'
            : 'is no longer subject to review'
        : 'was resubmitted'

    return emailHeader
}

export const sendEQROContractResubmitStateEmail = async (
    contract: ContractType,
    submitterEmails: string[],
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const contractRev = contract.packageSubmissions[0].contractRevision
    const formData = contractRev.formData
    const stateContactEmails: string[] = []

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

    const reviewDeterminationChanged = eqroReviewDeterminationChanged(
        contract.id,
        subjectToReview,
        contract.packageSubmissions[1].contractRevision.formData
    )
    if (reviewDeterminationChanged instanceof Error) {
        return reviewDeterminationChanged
    }

    const emailHeader = resubmitEQROHeader(
        reviewDeterminationChanged,
        subjectToReview
    )

    const subjectLine = reviewDeterminationChanged
        ? 'review decision update'
        : 'was resubmitted'

    const etaData: ResubmitEQROTemplateData = {
        pkgName: pkgName,
        emailHeader: emailHeader,
        submittedBy: updateInfo.updatedBy.email,
        updatedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        subjectToReview: subjectToReview,
        reviewDeterminationChanged: reviewDeterminationChanged,
        changeSummary: updateInfo.updatedReason,
        submissionURL: submissionURL,
        MCGDMCOContactEmail: 'MCGDMCOactions@cms.hhs.gov',
    }

    const template = await renderTemplate<ResubmitEQROTemplateData>(
        'sendEQROContractResubmitStateEmail',
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
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${pkgName} ${subjectLine}`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
