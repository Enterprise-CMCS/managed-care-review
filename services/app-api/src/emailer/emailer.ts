import { sendSESEmail } from '../emailer'

import {
    getSESEmailParams,
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockContractCMSEmail,
    unlockContractStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmitPackageStateEmail,
    resubmitPackageCMSEmail,
    sendQuestionStateEmail,
    sendQuestionCMSEmail,
    sendQuestionResponseCMSEmail,
    sendQuestionResponseStateEmail,
} from './'
import type {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
} from '../common-code/healthPlanFormDataType'
import type {
    UpdateInfoType,
    ProgramType,
    ContractRevisionWithRatesType,
    Question,
} from '../domain-models'
import { SESServiceException } from '@aws-sdk/client-ses'

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
    sendCMSNewPackage: (
        formData: LockedHealthPlanFormDataType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendStateNewPackage: (
        formData: LockedHealthPlanFormDataType,
        submitterEmails: string[],
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockContractCMSEmail: (
        contractRev: ContractRevisionWithRatesType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockContractStateEmail: (
        contractRev: ContractRevisionWithRatesType,
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
        formData: LockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        submitterEmails: string[],
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendResubmittedCMSEmail: (
        formData: LockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendQuestionsStateEmail: (
        contract: ContractRevisionWithRatesType,
        submitterEmails: string[],
        statePrograms: ProgramType[],
        question: Question
    ) => Promise<void | Error>
    sendQuestionsCMSEmail: (
        contract: ContractRevisionWithRatesType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[],
        questions: Question[]
    ) => Promise<void | Error>
    sendQuestionResponseCMSEmail: (
        contractRevision: ContractRevisionWithRatesType,
        statePrograms: ProgramType[],
        stateAnalystsEmails: StateAnalystsEmails,
        currentQuestion: Question,
        allContractQuestions: Question[]
    ) => Promise<void | Error>
    sendQuestionResponseStateEmail: (
        contractRevision: ContractRevisionWithRatesType,
        statePrograms: ProgramType[],
        submitterEmails: string[],
        currentQuestion: Question,
        allContractQuestions: Question[]
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
        sendCMSNewPackage: async function (
            formData,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await newPackageCMSEmail(
                formData,
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
        sendStateNewPackage: async function (
            formData,
            submitterEmails,
            statePrograms
        ) {
            const emailData = await newPackageStateEmail(
                formData,
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
            formData,
            updateInfo,
            submitterEmails,
            statePrograms
        ) {
            const emailData = await resubmitPackageStateEmail(
                formData,
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
            formData,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await resubmitPackageCMSEmail(
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
