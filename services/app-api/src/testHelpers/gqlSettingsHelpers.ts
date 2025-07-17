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
    const updateEmailConfig = (await server.executeOperation({
        query: UpdateEmailSettingsDocument,
        variables: {
            input: {
                emailConfiguration,
            },
        },
    }, {
        contextValue: { user: { role: 'ADMIN' } },
    })) as { body: { singleResult: { data?: any; errors?: any } } }

    if (updateEmailConfig.body.singleResult.errors) {
        console.info('errors', updateEmailConfig.body.singleResult.errors)
        throw new Error(
            `updateTestEmailSettings mutation failed with errors ${updateEmailConfig.body.singleResult.errors}`
        )
    }

    if (
        updateEmailConfig.body.singleResult.data === undefined ||
        updateEmailConfig.body.singleResult.data === null
    ) {
        throw new Error('updateTestEmailSettings returned nothing')
    }

    return updateEmailConfig.body.singleResult.data.updateEmailSettings
}

const fetchTestMcReviewSettings = async (
    server: ApolloServer
): Promise<FetchMcReviewSettingsPayload> => {
    const fetchMcReviewSettings = (await server.executeOperation({
        query: FetchMcReviewSettingsDocument,
    }, {
        contextValue: { user: { role: 'ADMIN' } },
    })) as { body: { singleResult: { data?: any; errors?: any } } }

    if (fetchMcReviewSettings.body.singleResult.errors) {
        console.info('errors', fetchMcReviewSettings.body.singleResult.errors)
        throw new Error(
            `fetchTestMcReviewSettings query failed with errors ${fetchMcReviewSettings.body.singleResult.errors}`
        )
    }

    if (
        fetchMcReviewSettings.body.singleResult.data === undefined ||
        fetchMcReviewSettings.body.singleResult.data === null
    ) {
        throw new Error('fetchTestMcReviewSettings returned nothing')
    }

    return fetchMcReviewSettings.body.singleResult.data.fetchMcReviewSettings
}

export { updateTestEmailSettings, fetchTestMcReviewSettings }
