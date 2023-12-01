import { packageName as generatePackageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData, StateAnalystsEmails } from '..'
import type { ProgramType, CMSUserType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
} from '../templateHelpers'
import { submissionQuestionResponseURL } from '../generateURLs'
import type { ContractRevisionWithRatesType } from '../../domain-models/contractAndRates'

export const sendQuestionCMSEmail = async (
    contractRev: ContractRevisionWithRatesType,
    submitterEmails: string[],
    stateAnalystsEmails: StateAnalystsEmails,
    cmsRequestor: CMSUserType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    dateAsked: Date,
    roundNumber: number
): Promise<EmailData | Error> => {
    const receiverEmails = pruneDuplicateEmails([
        ...stateAnalystsEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findContractPrograms(contractRev, statePrograms)
    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        contractRev.contract.stateCode,
        contractRev.contract.stateNumber,
        contractRev.formData.programIDs,
        packagePrograms
    )

    const questionResponseURL = submissionQuestionResponseURL(
        contractRev.contract.id,
        config.baseUrl
    )

    const data = {
        packageName,
        questionResponseURL,
        cmsRequestorEmail: cmsRequestor.email,
        cmsRequestorName: `${cmsRequestor.givenName} ${cmsRequestor.familyName}`,
        cmsRequestorDivision: cmsRequestor.divisionAssignment,
        dateAsked: formatCalendarDate(dateAsked),
        roundNumber,
    }

    const result = await renderTemplate<typeof data>(
        'sendQuestionCMSEmail',
        data
    )

    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            replyToAddresses: [config.helpDeskEmail],
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }New questions about ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
