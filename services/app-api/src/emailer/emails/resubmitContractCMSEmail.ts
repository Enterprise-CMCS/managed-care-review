import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    stripHTMLFromTemplate,
    generateCMSReviewerEmailsForSubmittedContract,
    renderTemplate,
    findContractPrograms,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import type {
    ProgramType,
    UpdateInfoType,
    ContractType,
} from '../../domain-models'
import { submissionSummaryURL } from '../generateURLs'

export const resubmitContractCMSEmail = async (
    contract: ContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
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
    const formData = contractRev.formData
    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findContractPrograms(contractRev, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        contract.stateCode,
        contract.stateNumber,
        formData.programIDs,
        packagePrograms
    )

    const isContractAndRates =
        formData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(contract.packageSubmissions[0].rateRevisions.length)

    const packageURL = submissionSummaryURL(contract.id, config.baseUrl)

    const data = {
        packageName: packageName,
        resubmittedBy: updateInfo.updatedBy.email,
        resubmittedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/New_York'
        ),
        resubmissionReason: updateInfo.updatedReason,
        shouldIncludeRates: isContractAndRates,
        rateInfos:
            isContractAndRates &&
            contract.packageSubmissions[0].rateRevisions.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
            })),
        submissionURL: packageURL,
    }

    const result = await renderTemplate<typeof data>(
        'resubmitContractCMSEmail',
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
            }${packageName} was resubmitted`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
