import {
    eqroValidationAndReviewDetermination,
    packageName as generatePackageName,
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
    findContractPrograms,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { formatCalendarDate } from '@mc-review/dates'
import { pruneDuplicateEmails } from '../formatters'
import { submissionSummaryURL } from '../generateURLs'

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

    const submissionURL = submissionSummaryURL(
        contract.id,
        contract.contractSubmissionType,
        config.baseUrl
    )

    const isEQRO = contract.contractSubmissionType === `EQRO`

    const isNotSubjectToReview =
        isEQRO &&
        eqroValidationAndReviewDetermination(contract.id, formData) === false

    const etaData = {
        packageName,
        updatedAt: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        updatedBy: updateInfo.updatedBy.email,
        reason: updateInfo.updatedReason,
        status: isNotSubjectToReview ? `Not subject to review` : `Submitted`,
        isEQRO,
        reviewDecisionText: isNotSubjectToReview
            ? `Not subject to formal review and approval`
            : `Subject to formal review and approval`,
        shouldIncludeRates: isContractAndRates,
        rateInfos: contract.packageSubmissions[0].rateRevisions.map((rate) => ({
            rateName: rate.formData.rateCertificationName,
        })),
        submissionURL,
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
            }${packageName} unlock was undone by CMS`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
