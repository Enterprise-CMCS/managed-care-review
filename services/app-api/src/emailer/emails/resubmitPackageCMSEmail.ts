import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    stripHTMLFromTemplate,
    generateCMSReviewerEmails,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import { URL } from 'url'
import { ProgramType, UpdateInfoType } from '../../domain-models'
import { formatDateTime } from '../../../../app-web/src/common-code/dateHelpers/calendarDate'

export const resubmitPackageCMSEmail = async (
    pkg: LockedHealthPlanFormDataType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateCMSReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )
    const packagePrograms = findPackagePrograms(pkg, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(pkg, packagePrograms)

    const isContractAndRates = pkg.submissionType === 'CONTRACT_AND_RATES'

    const data = {
        packageName: packageName,
        resubmittedBy: updateInfo.updatedBy,
        resubmittedOn: formatDateTime(updateInfo.updatedAt),
        resubmissionReason: updateInfo.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateName: isContractAndRates && generateRateName(pkg, packagePrograms),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    const result = await renderTemplate<typeof data>(
        'resubmitPackageCMSEmail',
        data
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was resubmitted`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
