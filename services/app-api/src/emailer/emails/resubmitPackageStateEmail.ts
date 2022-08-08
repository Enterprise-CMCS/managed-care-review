import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { UserType, UpdateInfoType, ProgramType } from '../../domain-models'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    generateStateReceiverEmails,
    findPackagePrograms,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration } from '../'

export const resubmitPackageStateEmail = async (
    pkg: LockedHealthPlanFormDataType,
    user: UserType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const receiverEmails = generateStateReceiverEmails(pkg, user)
    const programs = findPackagePrograms(pkg, statePrograms)

    if (programs instanceof Error) {
        return programs
    }

    const packageName = generatePackageName(pkg, programs)

    const isContractAndRates = pkg.submissionType === 'CONTRACT_AND_RATES'

    const data = {
        packageName,
        resubmittedBy: updateInfo.updatedBy,
        resubmittedOn: formatCalendarDate(updateInfo.updatedAt),
        resubmissionReason: updateInfo.updatedReason,
        shouldIncludeRates: isContractAndRates,
        rateName: isContractAndRates && generateRateName(pkg, programs),
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
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was resubmitted`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
