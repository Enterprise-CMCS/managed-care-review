import { packageName as generatePackageName } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type {
    ProgramType,
    ContractQuestionType,
    ContractRevisionType,
    ContractSubmissionType,
} from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    findContractPrograms,
    getQuestionRound,
} from '../templateHelpers'
import { submissionQuestionResponseURL } from '../generateURLs'
import type { StateAnalystsEmails } from '..'

export const sendQuestionResponseCMSEmail = async (
    contractRev: ContractRevisionType,
    contractSubmissionType: ContractSubmissionType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    stateAnalystsEmails: StateAnalystsEmails,
    currentQuestion: ContractQuestionType,
    allContractQuestions: ContractQuestionType[]
): Promise<EmailData | Error> => {
    // currentQuestion is the question the new response belongs to. Responses can be uploaded to any question round.
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
        receiverEmails.push(...config.dmcpReviewEmails)
    } else if (division === 'OACT' && contractRev.formData.riskBasedContract) {
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
        contractSubmissionType,
        config.baseUrl
    )

    const data = {
        packageName,
        questionResponseURL,
        cmsRequestorDivision: division,
        stateResponseSubmitterEmail: latestResponse.addedBy.email,
        stateResponseSubmitterName: `${latestResponse.addedBy.givenName} ${latestResponse.addedBy.familyName}`,
        questionRound,
        dateAsked: formatCalendarDate(
            currentQuestion.createdAt,
            'America/Los_Angeles'
        ),
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
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }New Responses for ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
