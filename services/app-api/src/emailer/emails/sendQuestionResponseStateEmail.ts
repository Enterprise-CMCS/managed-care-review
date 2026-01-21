import { packageName as generatePackageName } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import { formatEmailAddresses, pruneDuplicateEmails } from '../formatters'
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

export const sendQuestionResponseStateEmail = async (
    contractRev: ContractRevisionType,
    contractSubmissionType: ContractSubmissionType,
    config: EmailConfiguration,
    submitterEmails: string[],
    statePrograms: ProgramType[],
    allContractQuestions: ContractQuestionType[],
    currentQuestion: ContractQuestionType
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

    const questionResponseURL = submissionQuestionResponseURL(
        contractRev.contract.id,
        contractSubmissionType,
        config.baseUrl
    )

    const data = {
        packageName,
        questionResponseURL,
        cmsRequestorDivision: division,
        dateAsked: formatCalendarDate(
            currentQuestion.createdAt,
            'America/Los_Angeles'
        ),
        questionRound,
        cmsReviewHelpEmailAddress: formatEmailAddresses(
            config.cmsReviewHelpEmailAddress
        ),
        cmsRateHelpEmailAddress: formatEmailAddresses(
            config.cmsRateHelpEmailAddress
        ),
        helpDeskEmail: formatEmailAddresses(config.helpDeskEmail),
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
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }Response submitted to CMS for ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
