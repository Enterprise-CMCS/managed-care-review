import {
    LockedHealthPlanFormDataType,
    packageName as generatePackageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    stripHTMLFromTemplate,
    generateCMSReviewerEmails,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'

import type { EmailData, EmailConfiguration, StateAnalystsEmails } from '../'
import { URL } from 'url'
import { ProgramType, UpdateInfoType } from '../../domain-models'

export const resubmitPackageCMSEmail = async (
    pkg: LockedHealthPlanFormDataType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isUnitTest = config.baseUrl === 'http://localhost'
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

    const packageName = generatePackageName(pkg, packagePrograms)

    const isContractAndRates =
        pkg.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(pkg.rateInfos.length)

    const data = {
        packageName: packageName,
        resubmittedBy: updateInfo.updatedBy,
        resubmittedOn: formatCalendarDate(updateInfo.updatedAt),
        resubmissionReason: updateInfo.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateInfos:
            isContractAndRates &&
            pkg.rateInfos.map((rate) => ({
                rateName: rate.rateProgramName,
            })),
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
            subject: `${
                isTestEnvironment ? `[${config.stage}] ` : ''
            }${packageName} was resubmitted`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
