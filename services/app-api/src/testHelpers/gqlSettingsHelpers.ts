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
import type { Context } from '../handlers/apollo_gql'

import { extractGraphQLResponse } from './apolloV4ResponseHelper'

const updateTestEmailSettings = async (
    server: ApolloServer,
    emailConfiguration: EmailConfiguration,
    context?: Context
): Promise<UpdateEmailSettingsPayload> => {
    const response = await server.executeOperation({
        query: UpdateEmailSettingsDocument,
        variables: {
            input: {
                emailConfiguration,
            },
        },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const updateEmailConfig = extractGraphQLResponse(response)

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
    server: ApolloServer,
    context?: Context
): Promise<FetchMcReviewSettingsPayload> => {
    const response = await server.executeOperation({
        query: FetchMcReviewSettingsDocument,
    }, {
        contextValue: context || defaultContext(),
    })
    
    const fetchMcReviewSettings = extractGraphQLResponse(response)

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
