import { URL } from 'url'

import {
    UnlockedHealthPlanFormDataType,
    packageName as generatePackageName,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    generateStateReceiverEmails,
    findPackagePrograms,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'
import { ProgramType, UpdateInfoType } from '../../domain-models'
import { formatDateTime } from '../../../../app-web/src/common-code/dateHelpers/calendarDate'

export const unlockPackageStateEmail = async (
    pkg: UnlockedHealthPlanFormDataType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const receiverEmails = generateStateReceiverEmails(pkg)
    const packagePrograms = findPackagePrograms(pkg, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(pkg, packagePrograms)

    const isContractAndRates = pkg.submissionType === 'CONTRACT_AND_RATES'

    const data = {
        packageName,
        unlockedBy: updateInfo.updatedBy,
        unlockedOn: formatDateTime(updateInfo.updatedAt),
        unlockedReason: updateInfo.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateName: isContractAndRates && generateRateName(pkg, packagePrograms),
        submissionURL: new URL(
            `submissions/${pkg.id}/review-and-submit`,
            config.baseUrl
        ).href,
    }

    const result = await renderTemplate<typeof data>(
        'unlockPackageStateEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was unlocked by CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
