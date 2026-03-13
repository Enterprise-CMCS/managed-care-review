import {
    eqroReviewDeterminationChanged,
    eqroValidationAndReviewDetermination,
    packageName as generatePackageName,
    ManagedCareEntityRecord,
} from '@mc-review/submissions'
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
    booleanAsYesNoUserValue,
    findContractPrograms,
    generateCMSReviewerEmailsForSubmittedContract,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { submissionSummaryURL } from '../generateURLs'
import { formatCalendarDate } from '@mc-review/dates'
import type { ResubmitEQROTemplateData } from './sendEQROContractResubmitStateEmail'
import { resubmitEQROHeader } from './sendEQROContractResubmitStateEmail'

export const sendEQROContractResubmitCMSEmail = async (
    contract: ContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const contractRev = contract.packageSubmissions[0].contractRevision
    const formData = contractRev.formData
    const reviewerEmails = generateCMSReviewerEmailsForSubmittedContract(
        config,
        contract,
        stateAnalystsEmails
    )

    if (reviewerEmails instanceof Error) {
        return reviewerEmails
    }

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

    const {
        eqroNewContractor,
        eqroProvisionMcoEqrOrRelatedActivities,
        eqroProvisionMcoNewOptionalActivity,
        eqroProvisionNewMcoEqrRelatedActivities,
        eqroProvisionChipEqrRelatedActivities,
    } = formData

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
        managedCareEntities: formData.managedCareEntities
            .map((entity) => ManagedCareEntityRecord[entity])
            .join(', '),
        eqroNewContractor: booleanAsYesNoUserValue(eqroNewContractor),
        eqroProvisionMcoEqrOrRelatedActivities: booleanAsYesNoUserValue(
            eqroProvisionMcoEqrOrRelatedActivities
        ),
        eqroProvisionMcoNewOptionalActivity: booleanAsYesNoUserValue(
            eqroProvisionMcoNewOptionalActivity
        ),
        eqroProvisionNewMcoEqrRelatedActivities: booleanAsYesNoUserValue(
            eqroProvisionNewMcoEqrRelatedActivities
        ),
        eqroProvisionChipEqrRelatedActivities: booleanAsYesNoUserValue(
            eqroProvisionChipEqrRelatedActivities
        ),
    }

    const template = await renderTemplate<ResubmitEQROTemplateData>(
        'sendEQROContractResubmitCMSEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses: reviewerEmails,
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
