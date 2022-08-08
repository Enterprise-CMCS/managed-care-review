import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { UserType, UpdateInfoType } from '../../domain-models'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    generateStateReceiverEmails,
    findAllPackageProgramIds,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration } from '../'
import { logError } from '../../logger'
import { findPrograms } from '../../postgres'

export const resubmitPackageStateEmail = async (
    pkg: LockedHealthPlanFormDataType,
    user: UserType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const receiverEmails = generateStateReceiverEmails(pkg, user)
    const combinedProgramIDs = findAllPackageProgramIds(pkg)
    //Get program data from combined program ids
    const programs = findPrograms(pkg.stateCode, combinedProgramIDs)
    if (programs instanceof Error) {
        const errMessage = `${programs.message}, ${pkg.id}`
        logError('resubmitPackageStateEmail', errMessage)
        return new Error(errMessage)
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
