import type { ApolloServer } from '@apollo/server'
import type {
    EmailConfiguration,
    FetchMcReviewSettingsPayload,
    UpdateEmailSettingsPayload,
} from '../gen/gqlClient'
import {
    UpdateEmailSettingsDocument,
    FetchMcReviewSettingsDocument,
} from '../gen/gqlClient'
import { executeGraphQLOperation } from './gqlHelpers'
import type { Context } from '../handlers/apollo_gql'

const updateTestEmailSettings = async (
    server: ApolloServer,
    emailConfiguration: EmailConfiguration
): Promise<UpdateEmailSettingsPayload> => {
    const updateEmailConfig = await executeGraphQLOperation(server, {
        query: UpdateEmailSettingsDocument,
        variables: {
            input: {
                emailConfiguration,
            },
        },
    })

    if (updateEmailConfig.errors) {
        console.info('errors', updateEmailConfig.errors)
        throw new Error(
            `updateTestEmailSettings mutation failed with errors ${JSON.stringify(updateEmailConfig.errors)}`
        )
    }

    if (!updateEmailConfig.data.updateEmailSettings) {
        throw new Error('updateTestEmailSettings returned nothing')
    }

    return updateEmailConfig.data.updateEmailSettings
}

const fetchTestMcReviewSettings = async (
    server: ApolloServer,
    context?: Context
): Promise<FetchMcReviewSettingsPayload> => {
    const fetchMcReviewSettings = await executeGraphQLOperation(server, {
        query: FetchMcReviewSettingsDocument,
    })

    if (fetchMcReviewSettings.errors) {
        console.info('errors', fetchMcReviewSettings.errors)
        throw new Error(
            `fetchTestMcReviewSettings query failed with errors ${JSON.stringify(fetchMcReviewSettings.errors)}`
        )
    }

    if (!fetchMcReviewSettings.data.fetchMcReviewSettings) {
        throw new Error('fetchTestMcReviewSettings returned nothing')
    }

    return fetchMcReviewSettings.data.fetchMcReviewSettings
}

export { updateTestEmailSettings, fetchTestMcReviewSettings }
