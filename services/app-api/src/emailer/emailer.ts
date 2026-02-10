import { sendSESEmail, sendUndoWithdrawnSubmissionCMSEmail } from '../emailer'

import {
    getSESEmailParams,
    newContractCMSEmail,
    newContractStateEmail,
    newEqroContractStateEmail,
    unlockContractCMSEmail,
    unlockContractStateEmail,
    unlockEQROStateEmail,
    unlockEQROCMSEmail,
    resubmitContractStateEmail,
    resubmitContractCMSEmail,
    sendQuestionStateEmail,
    sendQuestionCMSEmail,
    sendQuestionResponseCMSEmail,
    sendQuestionResponseStateEmail,
    sendWithdrawnRateStateEmail,
    sendUndoWithdrawnRateStateEmail,
    sendUndoWithdrawnRateCMSEmail,
    sendWithdrawnSubmissionCMSEmail,
    sendWithdrawnSubmissionStateEmail,
    sendRateQuestionStateEmail,
    sendRateQuestionResponseCMSEmail,
    sendRateQuestionResponseStateEmail,
    sendRateQuestionCMSEmail,
    sendWithdrawnRateCMSEmail,
    sendUndoWithdrawnSubmissionStateEmail,
} from './'
import type {
    UpdateInfoType,
    ProgramType,
    ContractType,
    ContractQuestionType,
    ContractRevisionType,
    UnlockedContractType,
    RateType,
    RateQuestionType,
    ContractSubmissionType,
} from '../domain-models'
import { SESServiceException } from '@aws-sdk/client-ses'
import type { RateForDisplayType } from './templateHelpers'
import { newEQROContractCMSEmail } from './emails/newEQROContractCMSEmail'

// See more discussion of configuration in docs/Configuration.md
type EmailConfiguration = {
    stage: string
    baseUrl: string

    /* Email sender */
    emailSource: string

    /* Email receivers 
        These are general group-wide emails, relevant across submissions as potential receivers.
        Does not include any state specific emails, that is handled elsewhere with getStateAnalystsEmail.
     */
    devReviewTeamEmails: string[] // added by default to all incoming submissions
    oactEmails: string[] // OACT division emails
    dmcpReviewEmails: string[] // DMCP division emails for reviews
    dmcpSubmissionEmails: string[] // DMCP division emails for submissions
    dmcoEmails: string[] // DMCO division emails

    /* Email addresses used in display text
        These email addresses are in specific email content, such as help text. Prod-like values may be used in staging env.
    */
    cmsReviewHelpEmailAddress: string //  managed care review group help
    cmsRateHelpEmailAddress: string //  rates help
    helpDeskEmail: string // all other help
}

type StateAnalystsEmails = string[]

type EmailData = {
    bodyText: string
    sourceEmail: string
    subject: string
    toAddresses: string[]
    bccAddresses?: string[]
    ccAddresses?: string[]
    replyToAddresses?: string[]
    subjectCharset?: string
    bodyCharset?: string
    bodyHTML?: string
}

type SendEmailFunction = (emailData: EmailData) => Promise<void | Error>

type Emailer = {
    config: EmailConfiguration
    sendEmail: SendEmailFunction
    sendCMSNewContract: (
        contract: ContractType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendCMSNewEQROContract: (
        contract: ContractType,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendStateNewContract: (
        contract: ContractType,
        submitterEmails: string[],
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendStateNewEQROContract: (
        contract: ContractType,
        submitterEmails: string[],
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockContractCMSEmail: (
        contract: UnlockedContractType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockContractStateEmail: (
        contract: UnlockedContractType,
        updateInfo: UpdateInfoType,
        statePrograms: ProgramType[],
        submitterEmails: string[]
    ) => Promise<void | Error>
    sendUnlockEQROCMSEmail: (
        contract: UnlockedContractType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockEQROStateEmail: (
        contract: UnlockedContractType,
        updateInfo: UpdateInfoType,
        statePrograms: ProgramType[],
        submitterEmails: string[]
    ) => Promise<void | Error>
    sendResubmittedStateEmail: (
        contract: ContractType,
        updateInfo: UpdateInfoType,
        submitterEmails: string[],
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendResubmittedCMSEmail: (
        contract: ContractType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendQuestionsStateEmail: (
        contract: ContractRevisionType,
        contractSubmissionType: ContractSubmissionType,
        submitterEmails: string[],
        statePrograms: ProgramType[],
        question: ContractQuestionType
    ) => Promise<void | Error>
    sendQuestionsCMSEmail: (
        contract: ContractRevisionType,
        contractSubmissionType: ContractSubmissionType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[],
        questions: ContractQuestionType[]
    ) => Promise<void | Error>
    sendQuestionResponseCMSEmail: (
        contractRevision: ContractRevisionType,
        contractSubmissionType: ContractSubmissionType,
        statePrograms: ProgramType[],
        stateAnalystsEmails: StateAnalystsEmails,
        currentQuestion: ContractQuestionType,
        allContractQuestions: ContractQuestionType[]
    ) => Promise<void | Error>
    sendQuestionResponseStateEmail: (
        contractRevision: ContractRevisionType,
        contractSubmissionType: ContractSubmissionType,
        statePrograms: ProgramType[],
        submitterEmails: string[],
        currentQuestion: ContractQuestionType,
        allContractQuestions: ContractQuestionType[]
    ) => Promise<void | Error>
    sendRateQuestionStateEmail: (
        rate: RateType,
        contractSubmissionType: ContractSubmissionType,
        rateQuestion: RateQuestionType
    ) => Promise<void | Error>
    sendRateQuestionCMSEmail: (
        rate: RateType,
        stateAnalystsEmails: StateAnalystsEmails,
        questions: RateQuestionType[],
        currentQuestion: RateQuestionType
    ) => Promise<void | Error>
    sendRateQuestionResponseCMSEmail: (
        rate: RateType,
        stateAnalystsEmails: StateAnalystsEmails,
        questions: RateQuestionType[],
        currentQuestion: RateQuestionType
    ) => Promise<void | Error>
    sendRateQuestionResponseStateEmail: (
        rate: RateType,
        contractSubmissionType: ContractSubmissionType,
        questions: RateQuestionType[],
        currentQuestion: RateQuestionType
    ) => Promise<void | Error>
    sendWithdrawnRateStateEmail: (
        rate: RateType,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendWithdrawnRateCMSEmail: (
        rate: RateType,
        statePrograms: ProgramType[],
        stateAnalystsEmails: StateAnalystsEmails
    ) => Promise<void | Error>
    sendUndoWithdrawnRateStateEmail: (
        rate: RateType,
        contractSubmissionType: ContractSubmissionType,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUndoWithdrawnRateCMSEmail: (
        rate: RateType,
        contractSubmissionType: ContractSubmissionType,
        statePrograms: ProgramType[],
        stateAnalystsEmails: StateAnalystsEmails
    ) => Promise<void | Error>
    sendWithdrawnSubmissionCMSEmail: (
        withdrawnContract: ContractType,
        ratesForDisplay: RateForDisplayType[],
        stateAnalystsEmails: StateAnalystsEmails
    ) => Promise<void | Error>
    sendWithdrawnSubmissionStateEmail: (
        withdrawnContract: ContractType,
        ratesForDisplay: RateForDisplayType[]
    ) => Promise<void | Error>
    sendUndoWithdrawnSubmissionStateEmail: (
        contract: ContractType,
        ratesForDisplay: RateForDisplayType[]
    ) => Promise<void | Error>
    sendUndoWithdrawnSubmissionCMSEmail: (
        contract: ContractType,
        ratesForDisplay: RateForDisplayType[],
        stateAnalystsEmails: StateAnalystsEmails
    ) => Promise<void | Error>
}
const localEmailerLogger = (emailData: EmailData) => {
    const params = getSESEmailParams(emailData)
    const { Destination, Message, Source } = params

    const emailBody = Message?.Body?.Text?.Data ?? 'No email body content found'
    const subject = Message?.Subject?.Data ?? 'No email subject content found'
    const to = Destination?.ToAddresses?.length ? Destination?.ToAddresses : []
    const cc = Destination?.CcAddresses?.length ? Destination?.CcAddresses : []
    const bcc = Destination?.BccAddresses?.length
        ? Destination?.BccAddresses
        : []

    console.info('')
    console.info('(¯`·.¸¸.·´¯`·.¸¸.·´¯·📧 EMAIL SENT·´¯`·.¸¸.·´¯`·.¸¸.·´)')
    console.info(`From: ${Source}`)
    console.info(`To: ${to.join(', ')}`)
    console.info(`Cc: ${cc.join(', ')}`)
    console.info(`Bcc: ${bcc.join(', ')}`)
    console.info(`Subject: ${subject}`)
    console.info('────────────────────────────────────────────────────────────')
    console.info(emailBody)
    console.info('(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)')
    console.info('')
}

function emailer(
    config: EmailConfiguration,
    sendEmail: SendEmailFunction
): Emailer {
    return {
        config,
        sendEmail,
        sendCMSNewContract: async function (
            contract,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await newContractCMSEmail(
                contract,
                config,
                stateAnalystsEmails,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendCMSNewEQROContract: async function (contract, statePrograms) {
            const emailData = await newEQROContractCMSEmail(
                contract,
                config,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendStateNewContract: async function (
            contract,
            submitterEmails,
            statePrograms
        ) {
            const emailData = await newContractStateEmail(
                contract,
                submitterEmails,
                config,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendStateNewEQROContract: async function (
            contract,
            submitterEmails,
            statePrograms
        ) {
            const emailData = await newEqroContractStateEmail(
                contract,
                submitterEmails,
                config,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUnlockContractCMSEmail: async function (
            contract,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await unlockContractCMSEmail(
                contract,
                updateInfo,
                config,
                stateAnalystsEmails,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUnlockContractStateEmail: async function (
            contract,
            updateInfo,
            statePrograms,
            submitterEmails
        ) {
            const emailData = await unlockContractStateEmail(
                contract,
                updateInfo,
                config,
                statePrograms,
                submitterEmails
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUnlockEQROCMSEmail: async function (
            contract,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await unlockEQROCMSEmail(
                contract,
                updateInfo,
                config,
                stateAnalystsEmails,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUnlockEQROStateEmail: async function (
            contract,
            updateInfo,
            statePrograms,
            submitterEmails
        ) {
            const emailData = await unlockEQROStateEmail(
                contract,
                updateInfo,
                config,
                statePrograms,
                submitterEmails
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendResubmittedStateEmail: async function (
            contract,
            updateInfo,
            submitterEmails,
            statePrograms
        ) {
            const emailData = await resubmitContractStateEmail(
                contract,
                submitterEmails,
                updateInfo,
                config,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendResubmittedCMSEmail: async function (
            contract,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await resubmitContractCMSEmail(
                contract,
                updateInfo,
                config,
                stateAnalystsEmails,
                statePrograms
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendQuestionsStateEmail: async function (
            contract,
            contractSubmissionType,
            submitterEmails,
            statePrograms,
            question
        ) {
            const emailData = await sendQuestionStateEmail(
                contract,
                contractSubmissionType,
                submitterEmails,
                config,
                statePrograms,
                question
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendQuestionsCMSEmail: async function (
            contract,
            contractSubmissionType,
            stateAnalystsEmails,
            statePrograms,
            questions
        ) {
            const emailData = await sendQuestionCMSEmail(
                contract,
                contractSubmissionType,
                stateAnalystsEmails,
                config,
                statePrograms,
                questions
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendQuestionResponseCMSEmail: async function (
            contractRevision,
            contractSubmissionType,
            statePrograms,
            stateAnalystsEmails,
            currentQuestion,
            allContractQuestions
        ) {
            const emailData = await sendQuestionResponseCMSEmail(
                contractRevision,
                contractSubmissionType,
                config,
                statePrograms,
                stateAnalystsEmails,
                currentQuestion,
                allContractQuestions
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendQuestionResponseStateEmail: async function (
            contractRevision,
            contractSubmissionType,
            statePrograms,
            submitterEmails,
            currentQuestion,
            allContractQuestions
        ) {
            const emailData = await sendQuestionResponseStateEmail(
                contractRevision,
                contractSubmissionType,
                config,
                submitterEmails,
                statePrograms,
                allContractQuestions,
                currentQuestion
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendRateQuestionStateEmail: async function (
            rate,
            contractSubmissionType,
            rateQuestion
        ) {
            const emailData = await sendRateQuestionStateEmail(
                rate,
                contractSubmissionType,
                config,
                rateQuestion
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendRateQuestionCMSEmail: async function (
            rate,
            stateAnalystsEmails,
            questions,
            currentQuestion
        ) {
            const emailData = await sendRateQuestionCMSEmail(
                rate,
                stateAnalystsEmails,
                config,
                questions,
                currentQuestion
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendRateQuestionResponseCMSEmail: async function (
            rate,
            stateAnalystsEmails,
            questions,
            currentQuestion
        ) {
            const emailData = await sendRateQuestionResponseCMSEmail(
                rate,
                stateAnalystsEmails,
                config,
                questions,
                currentQuestion
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendRateQuestionResponseStateEmail: async function (
            rate,
            contractSubmissionType,
            questions,
            currentQuestion
        ) {
            const emailData = await sendRateQuestionResponseStateEmail(
                rate,
                contractSubmissionType,
                config,
                questions,
                currentQuestion
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendWithdrawnRateStateEmail: async function (rate, statePrograms) {
            const emailData = await sendWithdrawnRateStateEmail(
                config,
                rate,
                statePrograms
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendWithdrawnRateCMSEmail: async function (
            rate,
            statePrograms,
            stateAnalystsEmails
        ) {
            const emailData = await sendWithdrawnRateCMSEmail(
                config,
                rate,
                statePrograms,
                stateAnalystsEmails
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUndoWithdrawnRateStateEmail: async function (
            rate,
            contractSubmissionType,
            statePrograms
        ) {
            const emailData = await sendUndoWithdrawnRateStateEmail(
                rate,
                contractSubmissionType,
                statePrograms,
                config
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUndoWithdrawnRateCMSEmail: async function (
            rate,
            contractSubmissionType,
            statePrograms,
            stateAnalystsEmails
        ) {
            const emailData = await sendUndoWithdrawnRateCMSEmail(
                rate,
                contractSubmissionType,
                statePrograms,
                stateAnalystsEmails,
                config
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendWithdrawnSubmissionCMSEmail: async function (
            withdrawnContract,
            ratesForDisplay,
            stateAnalystsEmails
        ) {
            const emailData = await sendWithdrawnSubmissionCMSEmail(
                withdrawnContract,
                ratesForDisplay,
                stateAnalystsEmails,
                config
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendWithdrawnSubmissionStateEmail: async function (
            withdrawnContract,
            ratesForDisplay
        ) {
            const emailData = await sendWithdrawnSubmissionStateEmail(
                withdrawnContract,
                ratesForDisplay,
                config
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUndoWithdrawnSubmissionCMSEmail: async function (
            contract,
            ratesForDisplay,
            stateAnalystsEmails
        ) {
            const emailData = await sendUndoWithdrawnSubmissionCMSEmail(
                contract,
                ratesForDisplay,
                stateAnalystsEmails,
                config
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUndoWithdrawnSubmissionStateEmail: async function (
            contract,
            ratesForDisplay
        ) {
            const emailData = await sendUndoWithdrawnSubmissionStateEmail(
                contract,
                ratesForDisplay,
                config
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
    }
}

const sendSESEmails = async (emailData: EmailData): Promise<void | Error> => {
    const emailRequestParams = getSESEmailParams(emailData)

    try {
        await sendSESEmail(emailRequestParams)
        return
    } catch (err) {
        if (err instanceof SESServiceException) {
            return new Error(
                'SES email send failed. Error: ' + JSON.stringify(err)
            )
        }

        return new Error('SES email send failed. Error: ' + err)
    }
}

function newSESEmailer(config: EmailConfiguration): Emailer {
    return emailer(config, sendSESEmails)
}

const sendLocalEmails = async (emailData: EmailData): Promise<void | Error> => {
    localEmailerLogger(emailData)
}

function newLocalEmailer(config: EmailConfiguration): Emailer {
    return emailer(config, sendLocalEmails)
}

export { newLocalEmailer, newSESEmailer, emailer }
export type { Emailer, EmailConfiguration, EmailData, StateAnalystsEmails }
