import type { LockedHealthPlanFormDataType } from '../../common-code/healthPlanFormDataType'
import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import type { EmailConfiguration, EmailData, StateAnalystsEmails } from '..'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    generateCMSReviewerEmails,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'
import type { ProgramType } from '../../domain-models'
import { submissionSummaryURL } from '../generateURLs'

export const newPackageCMSEmail = async (
    pkg: LockedHealthPlanFormDataType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    // config
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateCMSReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )

    if (reviewerEmails instanceof Error) {
        return reviewerEmails
    }

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findPackagePrograms(pkg, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        pkg.stateCode,
        pkg.stateNumber,
        pkg.programIDs,
        packagePrograms
    )

    const packageURL = submissionSummaryURL(pkg.id, config.baseUrl)

    const isContractAndRates =
        pkg.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(pkg.rateInfos.length)

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
        contractDatesStart: formatCalendarDate(pkg.contractDateStart, 'UTC'),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd, 'UTC'),
        rateInfos:
            isContractAndRates &&
            pkg.rateInfos.map((rate) => ({
                rateName: rate.rateCertificationName,
                rateDateLabel:
                    rate.rateType === 'NEW'
                        ? 'Rating period'
                        : 'Rate amendment effective dates',
                rateDatesStart:
                    rate.rateType === 'AMENDMENT' && rate.rateAmendmentInfo
                        ? formatCalendarDate(
                              rate.rateAmendmentInfo.effectiveDateStart,
                              'UTC'
                          )
                        : formatCalendarDate(rate.rateDateStart, 'UTC'),
                rateDatesEnd:
                    rate.rateType === 'AMENDMENT' && rate.rateAmendmentInfo
                        ? formatCalendarDate(
                              rate.rateAmendmentInfo.effectiveDateEnd,
                              'UTC'
                          )
                        : formatCalendarDate(rate.rateDateEnd, 'UTC'),
            })),
        submissionURL: packageURL,
    }

    const result = await renderTemplate<typeof data>('newPackageCMSEmail', data)
    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: reviewerEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }New Managed Care Submission: ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
