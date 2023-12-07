import { packageName as generatePackageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { ProgramType, Question } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
} from '../templateHelpers'
import { submissionSummaryURL } from '../generateURLs'
import type { ContractRevisionWithRatesType } from '../../domain-models/contractAndRates'
import type { StateAnalystsEmails } from '..'
import { getQuestionRound } from '../../postgres/questionResponse'

export const sendQuestionResponseCMSEmail = async (
    contractRev: ContractRevisionWithRatesType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    stateAnalystsEmails: StateAnalystsEmails,
    currentQuestion: Question,
    allContractQuestions: Question[]
): Promise<EmailData | Error> => {
    const { responses, division } = currentQuestion
    const latestResponse = responses[0]
    const questionRound = getQuestionRound(
        allContractQuestions,
        currentQuestion
    )

    if (questionRound instanceof Error) {
        return questionRound
    }

    let receiverEmails = [...stateAnalystsEmails, ...config.devReviewTeamEmails]
    if (division === 'DMCP') {
        // TODO: Remove placeholder after merging in Pearls work.
        // receiverEmails.push(...config.dmcpReviewEmails)
        receiverEmails.push('dmcpQAEmail@example.com')
    } else if (division === 'OACT') {
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

    // TODO: Replace this function with Q&A function after merging in Pearls work
    const packageURL = submissionSummaryURL(
        contractRev.contract.id,
        config.baseUrl
    )

    const data = {
        packageName,
        submissionURL: packageURL,
        cmsDivision: division,
        stateResponseSubmitterEmail: latestResponse.addedBy.email,
        stateResponseSubmitterName: `${latestResponse.addedBy.givenName} ${latestResponse.addedBy.familyName}`,
        questionRound: questionRound,
        dateAsked: formatCalendarDate(currentQuestion.createdAt),
    }

    const result = await renderTemplate<typeof data>(
        'sendQuestionResponseCMSEmail',
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
            }New Responses for ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
