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
import type { ExtendedPrismaClient } from '../postgres/prismaClient'
import { trace, SpanStatusCode } from '@opentelemetry/api'

/*
 * configuration.ts
 * Because we are using lambdas, several lambdas repeat configuration that
 * would otherwise only need to be done once. For convenience's sake, that
 * configuration is captured here.
 */

/**
 * Detect if stage is a review environment
 * Review environments have frequently rotating credentials
 */
function isReviewEnvironment(stage: string): boolean {
    return !['dev', 'val', 'prod'].includes(stage)
}

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
    secretName: string | undefined,
    stage: string
): Promise<ExtendedPrismaClient | Error> {
    const tracer = trace.getTracer('postgres-configuration')
    const span = tracer.startSpan('postgres.configure', {
        attributes: {
            'postgres.stage': stage,
            'postgres.using_secrets_manager': dbURL === 'AWS_SM',
            'postgres.is_review_env': isReviewEnvironment(stage),
        },
    })

    try {
        console.info('Getting Postgres Connection')

        const dbConnResult = await getPostgresURL(dbURL, secretName)
        if (dbConnResult instanceof Error) {
            span.recordException(dbConnResult)
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: 'Failed to get postgres URL',
            })
            span.end()
            return dbConnResult
        }

        // Disable caching in review environments where credentials rotate on every deploy
        // Keep caching in dev/val/prod for performance (credentials rotate infrequently)
        const enableCaching = !isReviewEnvironment(stage)

        span.setAttributes({
            'postgres.cache_enabled': enableCaching,
            'postgres.cache_decision_reason': enableCaching
                ? 'stable_environment'
                : 'review_environment_frequent_rotation',
        })

        if (!enableCaching) {
            console.info(
                'Disabling Prisma client caching for review environment'
            )
        }

        const prismaResult = await NewPrismaClient(dbConnResult, enableCaching)

        if (prismaResult instanceof Error) {
            console.info(
                'Error: attempting to create prisma client: ',
                prismaResult
            )
            span.recordException(prismaResult)
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: 'Failed to create Prisma Client',
            })
            span.end()
            return new Error('Failed to create Prisma Client')
        }

        span.setStatus({ code: SpanStatusCode.OK })
        span.end()

        return prismaResult
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        span.recordException(err)
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message,
        })
        span.end()
        throw error
    }
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
    return secretsResult.dbClusterIdentifier.split(':').slice(-1)[0]
}

async function configureEmailerFromDatabase(
    store: Store
): Promise<Omit<EmailConfiguration, 'stage' | 'baseUrl'> | Error> {
    const emailSettings = await store.findEmailSettings()
    if (emailSettings instanceof Error) {
        return emailSettings
    }

    return {
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
