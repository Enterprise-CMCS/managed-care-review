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
import { defaultContext } from './gqlHelpers'

// Helper to extract GraphQL response from Apollo v4 response structure
function extractTestResponse(response: any): any {
    if ('body' in response && response.body) {
        return response.body.kind === 'single' ? response.body.singleResult : response.body
    }
    return response
}

const updateTestEmailSettings = async (
    server: ApolloServer,
    emailConfiguration: EmailConfiguration
): Promise<UpdateEmailSettingsPayload> => {
    const response = await server.executeOperation({
        query: UpdateEmailSettingsDocument,
        variables: {
            input: {
                emailConfiguration,
            },
        },
    }, {
        contextValue: defaultContext(),
    })
    
    const updateEmailConfig = extractTestResponse(response)

    if (updateEmailConfig.errors) {
        console.info('errors', updateEmailConfig.errors)
        throw new Error(
            `updateTestEmailSettings mutation failed with errors ${JSON.stringify(updateEmailConfig.errors)}`
        )
    }

    if (
        updateEmailConfig.data === undefined ||
        updateEmailConfig.data === null
    ) {
        throw new Error('updateTestEmailSettings returned nothing')
    }

    return updateEmailConfig.data.updateEmailSettings
}

const fetchTestMcReviewSettings = async (
    server: ApolloServer
): Promise<FetchMcReviewSettingsPayload> => {
    const response = await server.executeOperation({
        query: FetchMcReviewSettingsDocument,
    }, {
        contextValue: defaultContext(),
    })
    
    const fetchMcReviewSettings = extractTestResponse(response)

    if (fetchMcReviewSettings.errors) {
        console.info('errors', fetchMcReviewSettings.errors)
        throw new Error(
            `fetchTestMcReviewSettings query failed with errors ${JSON.stringify(fetchMcReviewSettings.errors)}`
        )
    }

    if (
        fetchMcReviewSettings.data === undefined ||
        fetchMcReviewSettings.data === null
    ) {
        throw new Error('fetchTestMcReviewSettings returned nothing')
    }

    return fetchMcReviewSettings.data.fetchMcReviewSettings
}

export { updateTestEmailSettings, fetchTestMcReviewSettings }
