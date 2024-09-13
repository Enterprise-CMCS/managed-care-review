import type { LockedHealthPlanFormDataType } from '@mc-review/hpp'
import { packageName as generatePackageName } from '@mc-review/hpp'
import { formatCalendarDate } from '@mc-review/common-code'
import type { UpdateInfoType, ProgramType } from '../../domain-models'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    findPackagePrograms,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration } from '../'
import { pruneDuplicateEmails } from '../formatters'

export const resubmitPackageStateEmail = async (
    formData: LockedHealthPlanFormDataType,
    submitterEmails: string[],
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const stateContactEmails: string[] = []
    formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findPackagePrograms(formData, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        formData.stateCode,
        formData.stateNumber,
        formData.programIDs,
        packagePrograms
    )

    const isContractAndRates =
        formData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(formData.rateInfos.length)

    const data = {
        packageName,
        resubmittedBy: updateInfo.updatedBy.email,
        resubmittedOn: formatCalendarDate(updateInfo.updatedAt),
        resubmissionReason: updateInfo.updatedReason,
        shouldIncludeRates: isContractAndRates,
        rateInfos:
            isContractAndRates &&
            formData.rateInfos.map((rate) => ({
                rateName: rate.rateCertificationName,
            })),
    }

    const result = await renderTemplate<typeof data>(
        'resubmitPackageStateEmail',
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
