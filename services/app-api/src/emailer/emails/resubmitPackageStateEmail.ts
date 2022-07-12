import {
    LockedHealthPlanFormDataType,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { UserType } from '../../domain-models'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    UpdatedEmailData,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration } from '../'

export const resubmitPackageStateEmail = async (
    pkg: LockedHealthPlanFormDataType,
    user: UserType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const currentUserEmail = user.email
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const receiverEmails: string[] = [currentUserEmail].concat(
        pkg.stateContacts.map((contact) => contact.email)
    )

    const data = {
        packageName: resubmittedData.packageName,
        resubmittedBy: resubmittedData.updatedBy,
        resubmittedOn: formatCalendarDate(resubmittedData.updatedAt),
        resubmissionReason: resubmittedData.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateName: generateRateName(pkg, resubmittedData.packageName),
    }

    const result = await renderTemplate<typeof data>(
        'resubmitPackageStateEmail',
        data,
        isUnitTest
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${
                resubmittedData.packageName
            } was resubmitted`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
