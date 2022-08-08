import { URL } from 'url'

import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
    generateRateName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { EmailConfiguration, EmailData } from '..'
import { UserType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    renderTemplate,
    generateStateReceiverEmails,
    findAllPackageProgramIds,
} from '../templateHelpers'
import { logError } from '../../logger'
import { findPrograms } from '../../postgres'

export const newPackageStateEmail = async (
    pkg: LockedHealthPlanFormDataType,
    user: UserType,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
    const receiverEmails = generateStateReceiverEmails(pkg, user)
    const combinedProgramIDs = findAllPackageProgramIds(pkg)
    //Get program data from combined program ids
    const programs = findPrograms(pkg.stateCode, combinedProgramIDs)
    if (programs instanceof Error) {
        const errMessage = `${programs.message}, ${pkg.id}`
        logError('newPackageStateEmail', errMessage)
        return new Error(errMessage)
    }

    const packageName = generatePackageName(pkg, programs)

    const hasRateAmendmentInfo =
        pkg.rateType === 'AMENDMENT' && pkg.rateAmendmentInfo

    const isContractAndRates = pkg.submissionType === 'CONTRACT_AND_RATES'

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
        rateName: isContractAndRates && generateRateName(pkg, programs),
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
