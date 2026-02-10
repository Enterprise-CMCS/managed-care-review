import { packageName as generatePackageName } from '@mc-review/submissions'
import type {
    UnlockedContractType,
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
    generateCMSReviewerEmailsForUnlockedContract,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { formatCalendarDate } from '@mc-review/dates'
import { submissionSummaryURL } from '../generateURLs'
import type { unlockEQROEmail } from './unlockEQROStateEmail'

export const unlockEQROCMSEmail = async (
    contract: UnlockedContractType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const contractRev = contract.packageSubmissions[0].contractRevision

    const reviewerEmails = generateCMSReviewerEmailsForUnlockedContract(
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
        contractRev.formData.programIDs,
        pkgPrograms
    )

    const submissionURL = submissionSummaryURL(
        contract.id,
        contract.contractSubmissionType,
        config.baseUrl
    )

    const etaData: unlockEQROEmail = {
        pkgName: pkgName,
        unlockedBy: updateInfo.updatedBy.email,
        unlockedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        unlockReason: updateInfo.updatedReason,
        submissionURL: submissionURL,
        cmsEmail: false,
    }

    const template = await renderTemplate<unlockEQROEmail>(
        'unlockEQROEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${pkgName} was unlocked`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
