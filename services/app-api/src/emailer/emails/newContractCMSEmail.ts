import { packageName as generatePackageName } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import type { EmailConfiguration, EmailData, StateAnalystsEmails } from '..'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    renderTemplate,
    findContractPrograms,
    generateCMSReviewerEmailsForSubmittedContract,
} from '../templateHelpers'
import type { ContractType, ProgramType } from '../../domain-models'
import { submissionSummaryURL } from '../generateURLs'

export const newContractCMSEmail = async (
    contract: ContractType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const reviewerEmails = generateCMSReviewerEmailsForSubmittedContract(
        config,
        contract,
        stateAnalystsEmails
    )

    if (reviewerEmails instanceof Error) {
        return reviewerEmails
    }
    const contractRev = contract.packageSubmissions[0].contractRevision
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

    const packageURL = submissionSummaryURL(
        contract.id,
        contract.contractSubmissionType,
        config.baseUrl
    )
    const contractSubmissionType =
        contract.contractSubmissionType === 'HEALTH_PLAN'
            ? 'Health plan'
            : 'External Quality Review Organization (EQRO)'

    const isContractAndRates =
        contractRev.formData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(contract.packageSubmissions[0].rateRevisions.length)

    const isChipOnly = contractRev.formData.populationCovered === 'CHIP'

    const data = {
        shouldIncludeRates: isContractAndRates,
        packageName: packageName,
        submissionType:
            SubmissionTypeRecord[contractRev.formData.submissionType],
        stateCode: contract.stateCode,
        submissionDescription: contractRev.formData.submissionDescription,
        contractDatesLabel:
            contractRev.formData.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(
            contractRev.formData.contractDateStart,
            'UTC'
        ),
        contractSubmissionType,
        contractDatesEnd: formatCalendarDate(
            contractRev.formData.contractDateEnd,
            'UTC'
        ),
        contractActionType:
            contractRev.formData.contractType === 'BASE'
                ? 'Base contract'
                : 'Amendment to base contract',
        rateInfos:
            isContractAndRates &&
            contract.packageSubmissions[0].rateRevisions.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
                rateDateLabel:
                    rate.formData.rateType === 'NEW'
                        ? 'Rating period'
                        : 'Rate amendment effective dates',
                rateDatesStart:
                    rate.formData.rateType === 'AMENDMENT'
                        ? formatCalendarDate(
                              rate.formData.amendmentEffectiveDateStart,
                              'UTC'
                          )
                        : formatCalendarDate(
                              rate.formData.rateDateStart,
                              'UTC'
                          ),
                rateDatesEnd:
                    rate.formData.rateType === 'AMENDMENT'
                        ? formatCalendarDate(
                              rate.formData.amendmentEffectiveDateEnd,
                              'UTC'
                          )
                        : formatCalendarDate(rate.formData.rateDateEnd, 'UTC'),
            })),
        submissionURL: packageURL,
    }

    const emailTemplate = isChipOnly
        ? 'newChipOnlyCMSEmail'
        : 'newContractCMSEmail'

    const result = await renderTemplate<typeof data>(emailTemplate, data)

    if (result instanceof Error) {
        return result
    } else {
        const stagePrefix = config.stage !== 'prod' ? `[${config.stage}] ` : ''
        const subjectLine = isChipOnly
            ? `${packageName} is not subject to DMCO review and validation`
            : `New Managed Care Submission: ${packageName}`

        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${stagePrefix}${subjectLine}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
