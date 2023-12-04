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
    question: Question
): Promise<EmailData | Error> => {
    let receiverEmails = [...stateAnalystsEmails, ...config.devReviewTeamEmails]
    if (question.addedBy.divisionAssignment === 'DMCP') {
        receiverEmails.push(...config.dmcpEmails)
    } else if (question.addedBy.divisionAssignment === 'OACT') {
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
    const roundNumber = question.responses.length + 1

    const data = {
        packageName,
        questionResponseURL,
        cmsRequestorEmail: question.addedBy.email,
        cmsRequestorName: `${question.addedBy.givenName} ${question.addedBy.familyName}`,
        cmsRequestorDivision: question.addedBy.divisionAssignment,
        dateAsked: formatCalendarDate(question.createdAt),
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
