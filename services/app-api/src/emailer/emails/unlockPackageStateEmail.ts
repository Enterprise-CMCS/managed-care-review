import {
    UnlockedHealthPlanFormDataType,
    packageName as generatePackageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    generateStateReceiverEmails,
    findPackagePrograms,
} from '../templateHelpers'
import type { EmailData, EmailConfiguration } from '../'
import { ProgramType, UpdateInfoType } from '../../domain-models'
import { reviewAndSubmitURL } from '../generateURLs'

export const unlockPackageStateEmail = async (
    pkg: UnlockedHealthPlanFormDataType,
    updateInfo: UpdateInfoType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const isTestEnvironment = config.stage !== 'prod'
    const receiverEmails = generateStateReceiverEmails(pkg)

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findPackagePrograms(pkg, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(pkg, packagePrograms)

    const isContractAndRates =
        pkg.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(pkg.rateInfos.length)

    const packageURL = reviewAndSubmitURL(pkg.id, config.baseUrl)

    const data = {
        packageName,
        unlockedBy: updateInfo.updatedBy,
        unlockedOn: formatCalendarDate(updateInfo.updatedAt),
        unlockedReason: updateInfo.updatedReason,
        shouldIncludeRates: pkg.submissionType === 'CONTRACT_AND_RATES',
        rateInfos:
            isContractAndRates &&
            pkg.rateInfos.map((rate) => ({
                rateName: rate.rateCertificationName,
            })),
        submissionURL: packageURL,
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
