import { URL } from 'url'

import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { EmailConfiguration, EmailData, StateAnalystsEmails } from '..'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    generateCMSReviewerEmails,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'
import { ProgramType } from '../../domain-models'

export const newPackageCMSEmail = async (
    pkg: LockedHealthPlanFormDataType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    // config
    const isUnitTest = config.baseUrl === 'http://localhost'
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

    const hasRateAmendmentInfo =
        pkg.rateType === 'AMENDMENT' && pkg.rateAmendmentInfo

    const isContractAndRates = pkg.submissionType === 'CONTRACT_AND_RATES'

    const data = {
        shouldIncludeRates: isContractAndRates,
        packageName: packageName,
        submissionType: SubmissionTypeRecord[pkg.submissionType],
        stateCode: pkg.stateCode,
        submissionDescription: pkg.submissionDescription,
        contractDatesLabel:
            pkg.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(pkg.contractDateStart),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd),
        rateName: isContractAndRates && generateRateName(pkg, packagePrograms),
        rateDateLabel:
            pkg.rateType === 'NEW'
                ? 'Rating period'
                : 'Rate amendment effective dates',
        rateDatesStart: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateStart)
            : formatCalendarDate(pkg.rateDateStart),
        rateDatesEnd: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateEnd)
            : formatCalendarDate(pkg.rateDateEnd),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    const result = await renderTemplate<typeof data>(
        'newPackageCMSEmail',
        data,
        isUnitTest
    )
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }New Managed Care Submission: ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
