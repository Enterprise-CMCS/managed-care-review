import {MockedResponse} from '@apollo/client/testing';
import {FetchMcReviewSettingsDocument, FetchMcReviewSettingsQuery} from '../../gen/gqlClient';
import {mockMNState} from './stateMock';
import { v4 as uuidv4 } from 'uuid'
import {ApolloError} from '@apollo/client';
import {GraphQLError} from 'graphql/index';
import {GRAPHQL_ERROR_CAUSE_MESSAGES} from './apolloErrorCodeMocks';

const fetchMcReviewSettingsMock = (): MockedResponse<FetchMcReviewSettingsQuery> => {
    return {
        request: {
            query: FetchMcReviewSettingsDocument,
            variables: {}
        },
        result: {
            data: {
                fetchMcReviewSettings: {
                    __typename: 'FetchMcReviewSettingsPayload' as const,
                    emailConfiguration: {
                        emailSource: 'local@example.com',
                        stage: 'localtest',
                        baseUrl: 'http://localtest',
                        devReviewTeamEmails: ['test@example.com'],
                        cmsReviewHelpEmailAddress: 'mcog@example.com',
                        cmsRateHelpEmailAddress: 'rates@example.com',
                        helpDeskEmail: 'helpdesk@example.com',
                        oactEmails: ['testRate@example.com'],
                        dmcpReviewEmails: ['testPolicy@example.com'],
                        dmcpSubmissionEmails: [
                            'testPolicySubmission@example.com',
                        ],
                        dmcoEmails: ['testDmco@example.com'],
                    },
                    stateAssignments: [
                        {
                            __typename: 'StateAssignment' as const,
                            stateCode: 'MN' as const,
                            name: 'Minnesota',
                            assignedCMSUsers: [
                                {
                                    __typename: 'CMSUser' as const,
                                    id: uuidv4(),
                                    role: 'CMS_USER',
                                    givenName: 'cmsUser1',
                                    familyName: 'cmsUser1',
                                    email: 'testMN@example.com',
                                    divisionAssignment: 'DMCO',
                                    stateAssignments: [
                                        mockMNState(),
                                        {
                                            code: 'OH',
                                            name: 'Ohio',
                                            programs: []
                                        }
                                    ],
                                },
                                {
                                    __typename: 'CMSApproverUser' as const,
                                    id: uuidv4(),
                                    role: 'CMS_APPROVER_USER',
                                    givenName: 'cmsApproverUser1',
                                    familyName: 'cmsApproverUser1',
                                    email: 'cmsApproverUser1@dmas.mn.gov',
                                    divisionAssignment: 'DMCO',
                                    stateAssignments: [
                                        mockMNState()
                                    ],
                                }
                            ],
                        },
                        {
                            __typename: 'StateAssignment' as const,
                            stateCode: 'OH' as const,
                            name: 'Ohio',
                            assignedCMSUsers: [
                                {
                                    __typename: 'CMSUser' as const,
                                    id: uuidv4(),
                                    role: 'CMS_USER',
                                    givenName: 'cmsUser2',
                                    familyName: 'cmsUser2',
                                    email: 'cmsUser2@dmas.mn.gov',
                                    divisionAssignment: 'DMCO',
                                    stateAssignments: [
                                        mockMNState(),
                                        {
                                            code: 'OH',
                                            name: 'Ohio',
                                            programs: []
                                        }
                                    ],
                                },
                                {
                                    __typename: 'CMSApproverUser' as const,
                                    id: uuidv4(),
                                    role: 'CMS_APPROVER_USER',
                                    givenName: 'cmsApproverUser2',
                                    familyName: 'cmsApproverUser2',
                                    email: 'cmsApproverUser2@dmas.mn.gov',
                                    divisionAssignment: 'DMCO',
                                    stateAssignments: [
                                        mockMNState(),
                                        {
                                            code: 'OH',
                                            name: 'Ohio',
                                            programs: []
                                        }
                                    ],
                                }
                            ],
                        },
                        {
                            __typename: 'StateAssignment' as const,
                            stateCode: 'FL' as const,
                            name: 'Florida',
                            assignedCMSUsers: [],
                        },
                    ],
                }
            }
        }
    }
}

const fetchMcReviewSettingsFailMock = (): MockedResponse<ApolloError> => {
    const graphQLError = new GraphQLError('Error fetching mc-review settings data.',
        {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                cause: 'DB Error',
            },
        }
    )
    return {
        request: {
            query: FetchMcReviewSettingsDocument,
            variables: {}
        },
        error: new ApolloError({
            graphQLErrors: [graphQLError]
        }),
        result: {
            data: null
        }
    }
}

export { fetchMcReviewSettingsMock, fetchMcReviewSettingsFailMock }
