import { packageName as generatePackageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { ProgramType, Question } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
    getQuestionRound,
} from '../templateHelpers'
import { mapNumberToStringWord } from '../../helpers'
import { submissionQuestionResponseURL } from '../generateURLs'
import type { ContractRevisionWithRatesType } from '../../domain-models/contractAndRates'


export const sendQuestionResponseStateEmail = async (
    contractRev: ContractRevisionWithRatesType,
    config: EmailConfiguration,
    submitterEmails: string[],
    statePrograms: ProgramType[],
    allContractQuestions: Question[],
    currentQuestion: Question,
): Promise<EmailData | Error> => {
    // currentQuestion is the question the new response belongs to. Responses can be uploaded to any question round.
    const division = currentQuestion.division
    const stateContactEmails: string[] = []
   
    contractRev.formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    const questionRound = getQuestionRound(
        allContractQuestions,
        currentQuestion
    )

    if (questionRound instanceof Error) {
        return questionRound
    }
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

    const rateName = contractRev.rateRevisions[0].formData.rateCertificationName
    const questionResponseURL = submissionQuestionResponseURL(
        contractRev.contract.id,
        config.baseUrl
    )

    const data = {
        packageName,
        questionResponseURL,
        rateName,
        cmsRequestorDivision: division,
        dateAsked: formatCalendarDate(currentQuestion.createdAt),
        questionRound: mapNumberToStringWord(questionRound)
    }

    const result = await renderTemplate<typeof data>(
        'sendQuestionResponseStateEmail',
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
            }Response submitted to CMS for ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}