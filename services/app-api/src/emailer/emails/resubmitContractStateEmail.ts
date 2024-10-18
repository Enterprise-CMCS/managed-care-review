import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
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

export const resubmitContractStateEmail = async (
    contract: ContractType,
    submitterEmails: string[],
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
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

    const data = {
        packageName,
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
    }

    const result = await renderTemplate<typeof data>(
        'resubmitContractStateEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
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
