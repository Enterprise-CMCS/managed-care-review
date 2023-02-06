import { sendSESEmail } from '../emailer'

import {
    getSESEmailParams,
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmitPackageStateEmail,
    resubmitPackageCMSEmail,
} from './'
import {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { UpdateInfoType, ProgramType } from '../domain-models'

type EmailConfiguration = {
    stage: string
    baseUrl: string

    /* Email sender */
    emailSource: string

    /* Email receivers 
        These are group-wide emails that are relevant across submissions.
        Does not include state specific emails. Those are calculated with getStateAnalystsEmails close to the specific email function
     */
    cmsReviewSharedEmails: string[] // list of shared emails that all new managed care packages must be sent to
    ratesReviewSharedEmails: string[] // list of shared emails that managed care packages with rates must be sent to

    /* Email addresses used in display text
        These email addresses are in specific email content, such as help text. Prod-like values may be used in staging env.
    */
    cmsReviewHelpEmailAddress: string //  managed care review group help
    cmsRateHelpEmailAddress: string //  rates help
    cmsDevTeamHelpEmailAddress: string //  all other help
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

type Emailer = {
    sendEmail: (emailData: EmailData) => Promise<void | Error>
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
}

function newSESEmailer(config: EmailConfiguration): Emailer {
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            const emailRequestParams = getSESEmailParams(emailData)

            try {
                await sendSESEmail(emailRequestParams)
                return
            } catch (err) {
                return new Error('SES email send failed. ' + err)
            }
        },
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
    }
}

const localEmailerLogger = (emailData: EmailData) =>
    console.info(`
        EMAIL SENT
        ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        ${JSON.stringify(getSESEmailParams(emailData))}
        ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
    `)

function newLocalEmailer(config: EmailConfiguration): Emailer {
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            localEmailerLogger(emailData)
        },
        sendCMSNewPackage: async (
            formData,
            stateAnalystsEmails,
            statePrograms
        ) => {
            const result = await newPackageCMSEmail(
                formData,
                config,
                stateAnalystsEmails,
                statePrograms
            )
            if (result instanceof Error) {
                console.error(result)
                return result
            } else {
                localEmailerLogger(result)
            }
        },
        sendStateNewPackage: async (
            formData,
            submitterEmails,
            statePrograms
        ) => {
            const result = await newPackageStateEmail(
                formData,
                submitterEmails,
                config,
                statePrograms
            )
            if (result instanceof Error) {
                console.error(result)
                return result
            } else {
                localEmailerLogger(result)
            }
        },
        sendUnlockPackageCMSEmail: async (
            formData,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) => {
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
                localEmailerLogger(emailData)
            }
        },
        sendUnlockPackageStateEmail: async (
            formData,
            updateInfo,
            statePrograms,
            submitterEmails
        ) => {
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
                localEmailerLogger(emailData)
            }
        },
        sendResubmittedStateEmail: async (
            formData,
            updateInfo,
            submitterEmails,
            statePrograms
        ) => {
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
                localEmailerLogger(emailData)
            }
        },
        sendResubmittedCMSEmail: async (
            formData,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) => {
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
                localEmailerLogger(emailData)
            }
        },
    }
}

export { newLocalEmailer, newSESEmailer }
export type { Emailer, EmailConfiguration, EmailData, StateAnalystsEmails }
