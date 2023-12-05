import { packageName as generatePackageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData, StateAnalystsEmails } from '..'
import type { ProgramType, Question } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
} from '../templateHelpers'
import { submissionQuestionResponseURL } from '../generateURLs'
import type { ContractRevisionWithRatesType } from '../../domain-models/contractAndRates'

export const sendQuestionCMSEmail = async (
    contractRev: ContractRevisionWithRatesType,
    stateAnalystsEmails: StateAnalystsEmails,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    questions: Question[]
): Promise<EmailData | Error> => {
    const newQuestion = questions[questions.length - 1]
    let receiverEmails = [...stateAnalystsEmails, ...config.devReviewTeamEmails]
    if (newQuestion.addedBy.divisionAssignment === 'DMCP') {
        receiverEmails.push(...config.dmcpReviewEmails)
    } else if (newQuestion.addedBy.divisionAssignment === 'OACT') {
        receiverEmails.push(...config.oactEmails)
    }
    receiverEmails = pruneDuplicateEmails(receiverEmails)

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
    const roundNumber = questions.length

    const data = {
        packageName,
        questionResponseURL,
        cmsRequestorEmail: newQuestion.addedBy.email,
        cmsRequestorName: `${newQuestion.addedBy.givenName} ${newQuestion.addedBy.familyName}`,
        cmsRequestorDivision: newQuestion.addedBy.divisionAssignment,
        dateAsked: formatCalendarDate(newQuestion.createdAt),
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
            }Questions sent for ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
