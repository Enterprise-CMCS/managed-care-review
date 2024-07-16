import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { ProgramType, Question } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
} from '../templateHelpers'
import { submissionQuestionResponseURL } from '../generateURLs'
import type { ContractRevisionWithRatesType } from '../../domain-models/contractAndRates'

export const sendQuestionStateEmail = async (
    contractRev: ContractRevisionWithRatesType,
    submitterEmails: string[],
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    currentQuestion: Question
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []

    contractRev.formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
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
        questionResponseURL: questionResponseURL,
        cmsRequestorEmail: currentQuestion.addedBy.email,
        cmsRequestorName: `${currentQuestion.addedBy.givenName} ${currentQuestion.addedBy.familyName}`,
        cmsRequestorDivision: currentQuestion.addedBy.divisionAssignment,
        dateAsked: formatCalendarDate(currentQuestion.createdAt),
    }

    const result = await renderTemplate<typeof data>(
        'sendQuestionStateEmail',
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
