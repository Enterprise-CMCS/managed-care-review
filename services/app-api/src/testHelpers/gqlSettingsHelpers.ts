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

const updateTestEmailSettings = async (
    server: ApolloServer,
    emailConfiguration: EmailConfiguration
): Promise<UpdateEmailSettingsPayload> => {
    const updateEmailConfig = await server.executeOperation({
        query: UpdateEmailSettingsDocument,
        variables: {
            input: {
                emailConfiguration,
            },
        },
    })

    if (updateEmailConfig.body.errors) {
        console.info('errors', updateEmailConfig.body.errors)
        throw new Error(
            `updateTestEmailSettings mutation failed with errors ${updateEmailConfig.body.errors}`
        )
    }

    if (
        updateEmailConfig.body.data === undefined ||
        updateEmailConfig.body.data === null
    ) {
        throw new Error('updateTestEmailSettings returned nothing')
    }

    return updateEmailConfig.body.data.updateEmailSettings
}

const fetchTestMcReviewSettings = async (
    server: ApolloServer
): Promise<FetchMcReviewSettingsPayload> => {
    const fetchMcReviewSettings = await server.executeOperation({
        query: FetchMcReviewSettingsDocument,
    })

    if (fetchMcReviewSettings.body.errors) {
        console.info('errors', fetchMcReviewSettings.body.errors)
        throw new Error(
            `fetchTestMcReviewSettings query failed with errors ${fetchMcReviewSettings.body.errors}`
        )
    }

    if (
        fetchMcReviewSettings.body.data === undefined ||
        fetchMcReviewSettings.body.data === null
    ) {
        throw new Error('fetchTestMcReviewSettings returned nothing')
    }

    return fetchMcReviewSettings.body.data.fetchMcReviewSettings
}

export { updateTestEmailSettings, fetchTestMcReviewSettings }
