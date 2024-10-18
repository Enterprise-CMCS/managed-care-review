import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
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
    // config
    const isTestEnvironment = config.stage !== 'prod'
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

    const packageURL = submissionSummaryURL(contract.id, config.baseUrl)

    const isContractAndRates =
        contractRev.formData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(contract.packageSubmissions[0].rateRevisions.length)

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
<<<<<<< HEAD:services/app-api/src/emailer/emails/newContractCMSEmail.ts
        contractDatesStart: formatCalendarDate(
            contractRev.formData.contractDateStart
        ),
        contractDatesEnd: formatCalendarDate(
            contractRev.formData.contractDateEnd
        ),
=======
        contractDatesStart: formatCalendarDate(pkg.contractDateStart, 'UTC'),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd, 'UTC'),
>>>>>>> 0cb8a3556e6c308701b7947a0a93d6e63741159d:services/app-api/src/emailer/emails/newPackageCMSEmail.ts
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
<<<<<<< HEAD:services/app-api/src/emailer/emails/newContractCMSEmail.ts
                              rate.formData.amendmentEffectiveDateStart
                          )
                        : formatCalendarDate(rate.formData.rateDateStart),
=======
                              rate.rateAmendmentInfo.effectiveDateStart,
                              'UTC'
                          )
                        : formatCalendarDate(rate.rateDateStart, 'UTC'),
>>>>>>> 0cb8a3556e6c308701b7947a0a93d6e63741159d:services/app-api/src/emailer/emails/newPackageCMSEmail.ts
                rateDatesEnd:
                    rate.formData.rateType === 'AMENDMENT'
                        ? formatCalendarDate(
<<<<<<< HEAD:services/app-api/src/emailer/emails/newContractCMSEmail.ts
                              rate.formData.amendmentEffectiveDateEnd
                          )
                        : formatCalendarDate(rate.formData.rateDateEnd),
=======
                              rate.rateAmendmentInfo.effectiveDateEnd,
                              'UTC'
                          )
                        : formatCalendarDate(rate.rateDateEnd, 'UTC'),
>>>>>>> 0cb8a3556e6c308701b7947a0a93d6e63741159d:services/app-api/src/emailer/emails/newPackageCMSEmail.ts
            })),
        submissionURL: packageURL,
    }

    const result = await renderTemplate<typeof data>(
        'newContractCMSEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }New Managed Care Submission: ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
