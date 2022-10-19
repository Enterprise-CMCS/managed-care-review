import { URL } from 'url'

import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { EmailConfiguration, EmailData } from '..'
import { ProgramType, UserType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    renderTemplate,
    generateStateReceiverEmails,
    findPackagePrograms,
} from '../templateHelpers'

export const newPackageStateEmail = async (
    pkg: LockedHealthPlanFormDataType,
    user: UserType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const receiverEmails = generateStateReceiverEmails(pkg, user)

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findPackagePrograms(pkg, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(pkg, packagePrograms)

    const isContractAndRates =
        pkg.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(pkg.rateInfos.length)

    const data = {
        shouldIncludeRates: isContractAndRates,
        cmsReviewHelpEmailAddress: config.cmsReviewHelpEmailAddress,
        cmsRateHelpEmailAddress: config.cmsRateHelpEmailAddress,
        cmsDevTeamHelpEmailAddress: config.cmsDevTeamHelpEmailAddress,
        packageName,
        submissionType: SubmissionTypeRecord[pkg.submissionType],
        submissionDescription: pkg.submissionDescription,
        contractType: pkg.contractType,
        contractDatesLabel:
            pkg.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(pkg.contractDateStart),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd),
        rateInfos:
            isContractAndRates &&
            pkg.rateInfos.map((rate) => ({
                rateName: rate.rateProgramName,
                rateDateLabel:
                    rate.rateType === 'NEW'
                        ? 'Rating period'
                        : 'Rate amendment effective dates',
                rateDatesStart:
                    rate.rateType === 'AMENDMENT' && rate.rateAmendmentInfo
                        ? formatCalendarDate(
                              rate.rateAmendmentInfo.effectiveDateStart
                          )
                        : formatCalendarDate(rate.rateDateStart),
                rateDatesEnd:
                    rate.rateType === 'AMENDMENT' && rate.rateAmendmentInfo
                        ? formatCalendarDate(
                              rate.rateAmendmentInfo.effectiveDateEnd
                          )
                        : formatCalendarDate(rate.rateDateEnd),
            })),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    const result = await renderTemplate<typeof data>(
        'newPackageStateEmail',
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
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${packageName} was sent to CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
