import type { ContractType, ProgramType } from '../../domain-models'
import type { EmailConfiguration } from '../emailer'
import {
    findContractPrograms,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import {
    eqroValidationAndReviewDetermination,
    packageName as generatePackageName,
} from '@mc-review/submissions'
import { submissionSummaryURL } from '../generateURLs'
import { formatCalendarDate } from '@mc-review/dates'
import { ManagedCareEntityRecord } from '@mc-review/submissions'
import { booleanAsYesNoUserValue } from '../templateHelpers'

export const newEQROContractCMSEmail = async (
    contract: ContractType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
) => {
    if (contract.contractSubmissionType === 'HEALTH_PLAN') {
        return new Error(
            'Incorrect contract submission type for EQRO submission email'
        )
    }

    const isTestEnvironment = config.stage !== 'prod'

    const { dmcoEmails, devReviewTeamEmails } = config

    const contractRev = contract.packageSubmissions[0].contractRevision
    const contractFormData = contractRev.formData

    const isSubjectToReview = eqroValidationAndReviewDetermination(
        contract.id,
        contractFormData
    )

    if (isSubjectToReview instanceof Error) {
        return isSubjectToReview
    }

    const reviewerEmails = [
        ...devReviewTeamEmails,
        ...(isSubjectToReview ? dmcoEmails : []),
    ]

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

    const packageURL = submissionSummaryURL(
        contract.id,
        contract.contractSubmissionType,
        config.baseUrl
    )

    const {
        eqroNewContractor,
        eqroProvisionMcoEqrOrRelatedActivities,
        eqroProvisionMcoNewOptionalActivity,
        eqroProvisionNewMcoEqrRelatedActivities,
        eqroProvisionChipEqrRelatedActivities,
    } = contractFormData

    const data = {
        stateCode: contract.stateCode,
        packageName: packageName,
        subjectToReview: isSubjectToReview
            ? 'is subject to CMS review'
            : 'is not subject to CMS review',
        contractSubmissionType: 'External Quality Review Organization (EQRO)',
        contractActionType:
            contractFormData.contractType === 'BASE'
                ? 'Base contract'
                : 'Amendment to base contract',
        contractDatesLabel:
            contractFormData.contractType === 'AMENDMENT'
                ? 'Amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(
            contractFormData.contractDateStart,
            'UTC'
        ),
        contractDatesEnd: formatCalendarDate(
            contractFormData.contractDateEnd,
            'UTC'
        ),
        managedCareEntities: contractFormData.managedCareEntities
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
        submissionDescription: contractFormData.submissionDescription,
        submissionURL: packageURL,
    }

    const result = await renderTemplate<typeof data>(
        'newEQROContractCMSEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        const subjectReviewText = isSubjectToReview
            ? 'is subject to CMS review and approval'
            : 'is not subject to CMS review'

        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }Submission ${packageName} ${subjectReviewText}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
