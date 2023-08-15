import { MockedResponse } from '@apollo/client/testing'
import {
    FetchEmailSettingsDocument,
    FetchEmailSettingsQuery,
} from '../../gen/gqlClient'

export const fetchEmailSettings =
    (): MockedResponse<FetchEmailSettingsQuery> => {
        return {
            request: {
                query: FetchEmailSettingsDocument,
            },
            result: {
                data: {
                    fetchEmailSettings: {
                        config: {
                            emailSource: 'local@example.com',
                            stage: 'localtest',
                            baseUrl: 'http://localtest',
                            devReviewTeamEmails: ['test@example.com'],
                            cmsReviewHelpEmailAddress: 'mcog@example.com',
                            cmsRateHelpEmailAddress: 'rates@example.com',
                            helpDeskEmail: 'mc-review@example.com',
                            oactEmails: ['testRate@example.com'],
                            dmcpEmails: ['testPolicy@example.com'],
                            dmcoEmails: ['testDmco@example.com'],
                        },
                        stateAnalysts: [
                            {
                                emails: ['testMN@example.com'],
                                stateCode: 'MN',
                            },
                        ],
                    },
                },
            },
        }
    }
