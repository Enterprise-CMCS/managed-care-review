import { sendSESEmail } from '../emailer'

import {
    getSESEmailParams,
    newContractCMSEmail,
    newContractStateEmail,
    unlockContractCMSEmail,
    unlockContractStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmitContractStateEmail,
    resubmitContractCMSEmail,
    sendQuestionStateEmail,
    sendQuestionCMSEmail,
    sendQuestionResponseCMSEmail,
    sendQuestionResponseStateEmail,
    sendWithdrawnRateStateEmail,
    sendUndoWithdrawnRateStateEmail,
    sendUndoWithdrawnRateCMSEmail,
} from './'
import type { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import type {
    UpdateInfoType,
    ProgramType,
    ContractType,
    ContractQuestionType,
    ContractRevisionType,
    UnlockedContractType,
    RateType,
    RateQuestionType,
} from '../domain-models'
import { SESServiceException } from '@aws-sdk/client-ses'
import { sendRateQuestionStateEmail } from './emails'
import { sendRateQuestionCMSEmail } from './emails/sendRateQuestionCMSEmail'
import { sendRateQuestionResponseCMSEmail } from './emails/sendRateQuestionResponseCMSEmail'
import { sendRateQuestionResponseStateEmail } from './emails/sendRateQuestionResponseStateEmail'
import { sendWithdrawnRateCMSEmail } from './emails/sendWithdrawnRateCMSEmail'

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
    sendStateNewContract: (
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
    sendUnlockPackageCMSEmail: (
        formData: UnlockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockPackageStateEmail: (
        formData: UnlockedHealthPlanFormDataType,
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
        submitterEmails: string[],
        statePrograms: ProgramType[],
        question: ContractQuestionType
    ) => Promise<void | Error>
    sendQuestionsCMSEmail: (
        contract: ContractRevisionType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[],
        questions: ContractQuestionType[]
    ) => Promise<void | Error>
    sendQuestionResponseCMSEmail: (
        contractRevision: ContractRevisionType,
        statePrograms: ProgramType[],
        stateAnalystsEmails: StateAnalystsEmails,
        currentQuestion: ContractQuestionType,
        allContractQuestions: ContractQuestionType[]
    ) => Promise<void | Error>
    sendQuestionResponseStateEmail: (
        contractRevision: ContractRevisionType,
        statePrograms: ProgramType[],
        submitterEmails: string[],
        currentQuestion: ContractQuestionType,
        allContractQuestions: ContractQuestionType[]
    ) => Promise<void | Error>
    sendRateQuestionStateEmail: (
        rate: RateType,
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
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUndoWithdrawnRateCMSEmail: (
        rate: RateType,
        statePrograms: ProgramType[],
        stateAnalystsEmails: StateAnalystsEmails
    ) => Promise<void | Error>
}
const localEmailerLogger = (emailData: EmailData) =>
    console.info(`
        EMAIL SENT
        ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        ${JSON.stringify(getSESEmailParams(emailData))}
        ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
    `)

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
        sendUnlockPackageCMSEmail: async function (
            formData,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await unlockPackageCMSEmail(
                formData,
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
        sendUnlockPackageStateEmail: async function (
            formData,
            updateInfo,
            statePrograms,
            submitterEmails
        ) {
            const emailData = await unlockPackageStateEmail(
                formData,
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
            submitterEmails,
            statePrograms,
            question
        ) {
            const emailData = await sendQuestionStateEmail(
                contract,
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
            stateAnalystsEmails,
            statePrograms,
            questions
        ) {
            const emailData = await sendQuestionCMSEmail(
                contract,
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
            statePrograms,
            stateAnalystsEmails,
            currentQuestion,
            allContractQuestions
        ) {
            const emailData = await sendQuestionResponseCMSEmail(
                contractRevision,
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
            statePrograms,
            submitterEmails,
            currentQuestion,
            allContractQuestions
        ) {
            const emailData = await sendQuestionResponseStateEmail(
                contractRevision,
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
        sendRateQuestionStateEmail: async function (rate, rateQuestion) {
            const emailData = await sendRateQuestionStateEmail(
                rate,
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
            questions,
            currentQuestion
        ) {
            const emailData = await sendRateQuestionResponseStateEmail(
                rate,
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
        sendUndoWithdrawnRateStateEmail: async function (rate, statePrograms) {
            const emailData = await sendUndoWithdrawnRateStateEmail(
                rate,
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
            statePrograms,
            stateAnalystsEmails
        ) {
            const emailData = await sendUndoWithdrawnRateCMSEmail(
                rate,
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
