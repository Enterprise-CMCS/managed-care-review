import type { PrismaClient } from '@prisma/client'
import { NewPrismaClient, type Store } from '../postgres'
import { FetchSecrets, getConnectionURL } from '../secrets'
import { type EmailParameterStore } from '../parameterStore'
import {
    type EmailConfiguration,
    type Emailer,
    newLocalEmailer,
    newSESEmailer,
} from '../emailer'
import { type LDService } from '../launchDarkly/launchDarkly'

/*
 * configuration.ts
 * Because we are using lambdas, several lambdas repeat configuration that
 * would otherwise only need to be done once. For convenience's sake, that
 * configuration is captured here.
 */

async function getPostgresURL(
    dbURL: string,
    secretName: string | undefined
): Promise<string | Error> {
    // If AWS_SM we need to query secrets manager to get these secrets
    if (dbURL === 'AWS_SM') {
        if (!secretName) {
            console.info(
                'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
            )
            return new Error(
                'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
            )
        }

        // We need to pull the db url out of AWS Secrets Manager
        // if we put more secrets in here, we'll probably need to instantiate it somewhere else
        const secretsResult = await FetchSecrets(secretName)
        if (secretsResult instanceof Error) {
            console.info(
                'Init Error: Failed to fetch secrets from Secrets Manager',
                secretsResult
            )
            return secretsResult
        }

        // assemble the connection URL from the stored secrets
        return getConnectionURL(secretsResult)
    }

    return dbURL
}

// configurePostgres takes our two env vars and attempts to configure postgres correctly
async function configurePostgres(
    dbURL: string,
    secretName: string | undefined
): Promise<PrismaClient | Error> {
    console.info('Getting Postgres Connection')

    const dbConnResult = await getPostgresURL(dbURL, secretName)
    if (dbConnResult instanceof Error) {
        return dbConnResult
    }

    const prismaResult = await NewPrismaClient(dbConnResult)

    if (prismaResult instanceof Error) {
        console.info(
            'Error: attempting to create prisma client: ',
            prismaResult
        )
        return new Error('Failed to create Prisma Client')
    }

    const client: PrismaClient = prismaResult as unknown as PrismaClient

    return client
}

async function getDBClusterID(secretName: string): Promise<string | Error> {
    const secretsResult = await FetchSecrets(secretName)
    if (secretsResult instanceof Error) {
        console.info(
            'Init Error: Failed to fetch secrets from Secrets Manager',
            secretsResult
        )
        return secretsResult
    }
    const dbID = secretsResult.dbClusterIdentifier.split(':').slice(-1)[0]
    return dbID
}

// cache settings for configureEmailerFromDatabse. Since we set these at lambda startup
// time rather than when the emails are sent, we need a way to get the current
// email settings if they are updated after the lambda has started.
let cachedEmailSettings: Omit<EmailConfiguration, 'stage' | 'baseUrl'> | null =
    null
let cacheTime = 0
const CACHE_TTL = 60 * 1000 // 1 minute

async function configureEmailerFromDatabase(
    store: Store
): Promise<Omit<EmailConfiguration, 'stage' | 'baseUrl'> | Error> {
    const now = Date.now()

    // Return cached settings if they exist and haven't expired
    if (cachedEmailSettings && now - cacheTime <= CACHE_TTL) {
        return cachedEmailSettings
    }

    const emailSettings = await store.findEmailSettings()
    if (emailSettings instanceof Error) {
        return emailSettings
    }

    const formattedSettings = {
        emailSource: emailSettings.emailSource,
        devReviewTeamEmails: emailSettings.devReviewTeamEmails,
        oactEmails: emailSettings.oactEmails,
        dmcpReviewEmails: emailSettings.dmcpReviewEmails,
        dmcpSubmissionEmails: emailSettings.dmcpSubmissionEmails,
        dmcoEmails: emailSettings.dmcoEmails,
        // These are stored as arrays in the database, but we need to convert them to strings
        // There will be a follow up ticket to refactor EmailConfiguration
        helpDeskEmail: emailSettings.helpDeskEmail[0],
        cmsReviewHelpEmailAddress: emailSettings.cmsReviewHelpEmailAddress[0],
        cmsRateHelpEmailAddress: emailSettings.cmsRateHelpEmailAddress[0],
    }

    // Update cache and timestamp
    cachedEmailSettings = formattedSettings
    cacheTime = now

    return formattedSettings
}

async function configureEmailerFromParamStore(
    emailParameterStore: EmailParameterStore
): Promise<Omit<EmailConfiguration, 'stage' | 'baseUrl'> | Error> {
    // Configuring emails using emailParameterStore
    // Moving setting these emails down here. We needed to retrieve all emails from parameter store using our
    // emailParameterStore because serverless does not like array of strings as env variables.
    // For more context see this ticket https://qmacbis.atlassian.net/browse/MR-2539.
    const emailSource = await emailParameterStore.getSourceEmail()
    const devReviewTeamEmails =
        await emailParameterStore.getDevReviewTeamEmails()
    const helpDeskEmail = await emailParameterStore.getHelpDeskEmail()
    const cmsReviewHelpEmailAddress =
        await emailParameterStore.getCmsReviewHelpEmail()
    const cmsRateHelpEmailAddress =
        await emailParameterStore.getCmsRateHelpEmail()
    const oactEmails = await emailParameterStore.getOACTEmails()
    const dmcpReviewEmails = await emailParameterStore.getDMCPReviewEmails()
    const dmcpSubmissionEmails =
        await emailParameterStore.getDMCPSubmissionEmails()
    const dmcoEmails = await emailParameterStore.getDMCOEmails()

    if (emailSource instanceof Error) return new Error(emailSource.message)

    if (devReviewTeamEmails instanceof Error)
        return new Error(devReviewTeamEmails.message)

    if (helpDeskEmail instanceof Error) return new Error(helpDeskEmail.message)

    if (cmsReviewHelpEmailAddress instanceof Error)
        return new Error(cmsReviewHelpEmailAddress.message)

    if (cmsRateHelpEmailAddress instanceof Error)
        return new Error(cmsRateHelpEmailAddress.message)

    if (oactEmails instanceof Error) return new Error(oactEmails.message)

    if (dmcpReviewEmails instanceof Error)
        return new Error(dmcpReviewEmails.message)

    if (dmcpSubmissionEmails instanceof Error)
        return new Error(dmcpSubmissionEmails.message)

    if (dmcoEmails instanceof Error) return new Error(dmcoEmails.message)

    return {
        emailSource,
        devReviewTeamEmails,
        helpDeskEmail,
        cmsReviewHelpEmailAddress,
        cmsRateHelpEmailAddress,
        oactEmails,
        dmcpReviewEmails,
        dmcpSubmissionEmails,
        dmcoEmails,
    }
}

// Note: Email settings won't update dynamically if the database changes while this lambda is running.
// Consider configuring the emailer later to fetch settings on demand.
async function configureEmailer({
    emailParameterStore,
    store,
    ldService,
    stageName,
    emailerMode,
    applicationEndpoint,
}: {
    emailParameterStore: EmailParameterStore
    store: Store
    ldService: LDService
    stageName: string
    emailerMode: string
    applicationEndpoint: string
}): Promise<Emailer | Error> {
    const removeParameterStore = await ldService.getFeatureFlag({
        key: 'throwaway-key-email-configuration', // we usually use unique user specific key from apollo context, this is an one off pattern for parameter store flag since its configured before we have that user in apollo context
        flag: 'remove-parameter-store',
        anonymous: true,
    })
    const emailSettings = removeParameterStore
        ? await configureEmailerFromDatabase(store)
        : await configureEmailerFromParamStore(emailParameterStore)

    if (emailSettings instanceof Error) {
        return emailSettings
    }

    return emailerMode == 'LOCAL'
        ? newLocalEmailer({
              stage: 'local',
              baseUrl: applicationEndpoint,
              ...emailSettings,
          })
        : newSESEmailer({
              stage: stageName,
              baseUrl: applicationEndpoint,
              ...emailSettings,
          })
}

export { configurePostgres, getPostgresURL, getDBClusterID, configureEmailer }
