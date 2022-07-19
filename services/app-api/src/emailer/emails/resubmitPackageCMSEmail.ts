import {
    LockedHealthPlanFormDataType,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    stripHTMLFromTemplate,
    UpdatedEmailData,
    generateCMSReviewerEmails,
    renderTemplate,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import { URL } from 'url'
import { formatDateTime } from 'app-web/src/common-code/dateHelpers/calendarDate'

export const resubmitPackageCMSEmail = async (
    pkg: LockedHealthPlanFormDataType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateCMSReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )

    const data = {
        packageName: resubmittedData.packageName,
        resubmittedBy: resubmittedData.updatedBy,
        resubmittedOn: formatDateTime(resubmittedData.updatedAt),
        resubmissionReason: resubmittedData.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateName: generateRateName(pkg, resubmittedData.packageName),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    const result = await renderTemplate<typeof data>(
        'resubmitPackageCMSEmail',
        data,
        isUnitTest
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            sourceEmail: config.emailSource,
            subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${
                resubmittedData.packageName
            } was resubmitted`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
