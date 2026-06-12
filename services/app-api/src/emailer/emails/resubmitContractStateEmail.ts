import { packageName as generatePackageName } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import type {
    UpdateInfoType,
    ContractType,
    ProgramType,
} from '../../domain-models'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    findContractPrograms,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'
import { pruneDuplicateEmails } from '../formatters'
import { submissionSummaryURL } from '../generateURLs'

export const resubmitContractStateEmail = async (
    contract: ContractType,
    submitterEmails: string[],
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []
    const contractRev = contract.packageSubmissions[0].contractRevision
    const formData = contractRev.formData
    formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

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

    const isChipOnly = formData.populationCovered === 'CHIP'

    const contractURL = submissionSummaryURL(
        contract.id,
        contract.contractSubmissionType,
        config.baseUrl
    )

    const data = {
        packageName,
        resubmittedBy: updateInfo.updatedBy.email,
        resubmittedOn: formatCalendarDate(
            updateInfo.updatedAt,
            'America/Los_Angeles'
        ),
        resubmissionReason: updateInfo.updatedReason,
        submissionURL: contractURL,
        shouldIncludeRates: isContractAndRates,
        rateInfos:
            isContractAndRates &&
            contract.packageSubmissions[0].rateRevisions.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
            })),
    }

    const emailTemplate = isChipOnly
        ? 'resubmitChipOnlyStateEmail'
        : 'resubmitContractStateEmail'

    const result = await renderTemplate<typeof data>(emailTemplate, data)
    if (result instanceof Error) {
        return result
    } else {
        const stagePrefix = config.stage !== 'prod' ? `[${config.stage}] ` : ''
        const subjectLine = isChipOnly
            ? `${packageName} is not subject to DMCO review and validation.`
            : `${packageName} was resubmitted`

        return {
            toAddresses: receiverEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${stagePrefix}${subjectLine}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
