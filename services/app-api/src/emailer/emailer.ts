import { Lambda } from '@aws-sdk/client-lambda'

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
import { UserType, UpdateInfoType, ProgramType } from '../domain-models'

type EmailConfiguration = {
    stage: string
    baseUrl: string
    emailSource: string // an email address for the generic application-wide sender
    cmsReviewSharedEmails: string[] // list of shared emails that all new managed care packages must be sent to
    ratesReviewSharedEmails: string[] // list of shared emails that managed care packages with rates must be sent to
    cmsReviewHelpEmailAddress: string // email address for the managed care organization group
    cmsRateHelpEmailAddress: string // email address for rates help
    cmsDevTeamHelpEmailAddress: string // email address for all other help
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
        submission: LockedHealthPlanFormDataType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendStateNewPackage: (
        submission: LockedHealthPlanFormDataType,
        user: UserType,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockPackageCMSEmail: (
        submission: UnlockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendUnlockPackageStateEmail: (
        submission: UnlockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendResubmittedStateEmail: (
        submission: LockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        user: UserType,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
    sendResubmittedCMSEmail: (
        submission: LockedHealthPlanFormDataType,
        updateInfo: UpdateInfoType,
        stateAnalystsEmails: StateAnalystsEmails,
        statePrograms: ProgramType[]
    ) => Promise<void | Error>
}

function newSESEmailer(config: EmailConfiguration): Emailer {
    const lambda = new Lambda({})
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            const emailRequestParams = getSESEmailParams(emailData)

            const lambdaParams = {
                FunctionName: `app-api-${config.stage}-email_submit`,
                Payload: JSON.parse(
                    Buffer.from(
                        JSON.stringify({
                            body: emailRequestParams,
                        })
                    ).toString() // Payload must be type of Uint8Array
                ),
            }

            try {
                await lambda.invoke(lambdaParams)
                return
            } catch (err) {
                return new Error('SES email send failed. ' + err)
            }
        },
        sendCMSNewPackage: async function (
            submission,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await newPackageCMSEmail(
                submission,
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
        sendStateNewPackage: async function (submission, user, statePrograms) {
            const emailData = await newPackageStateEmail(
                submission,
                user,
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
            submission,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await unlockPackageCMSEmail(
                submission,
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
            submission,
            updateInfo,
            statePrograms
        ) {
            const emailData = await unlockPackageStateEmail(
                submission,
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
        sendResubmittedStateEmail: async function (
            submission,
            updateInfo,
            user,
            statePrograms
        ) {
            const emailData = await resubmitPackageStateEmail(
                submission,
                user,
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
            submission,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) {
            const emailData = await resubmitPackageCMSEmail(
                submission,
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
    console.log(`
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
            submission,
            stateAnalystsEmails,
            statePrograms
        ) => {
            const result = await newPackageCMSEmail(
                submission,
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
        sendStateNewPackage: async (submission, user, statePrograms) => {
            const result = await newPackageStateEmail(
                submission,
                user,
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
            submission,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) => {
            const emailData = await unlockPackageCMSEmail(
                submission,
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
            submission,
            updateInfo,
            statePrograms
        ) => {
            const emailData = await unlockPackageStateEmail(
                submission,
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
        sendResubmittedStateEmail: async (
            submission,
            updateInfo,
            user,
            statePrograms
        ) => {
            const emailData = await resubmitPackageStateEmail(
                submission,
                user,
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
            submission,
            updateInfo,
            stateAnalystsEmails,
            statePrograms
        ) => {
            const emailData = await resubmitPackageCMSEmail(
                submission,
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
