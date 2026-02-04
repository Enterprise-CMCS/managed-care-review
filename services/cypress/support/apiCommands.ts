import {
    IndexUsersDocument,
    IndexUsersQuery,
    UserEdge,
    User,
    UpdateDivisionAssignmentDocument,
    FetchCurrentUserDocument,
    UpdateDraftContractRatesDocument,
    UpdateDraftContractRatesInput,
    Contract,
    SubmitContractDocument,
    CreateContractDocument,
    UpdateContractDraftRevisionDocument,
    UpdateContractDraftRevisionInput, CmsUsersUnion, Division, OauthClient, CreateOauthClientDocument,
} from '../gen/gqlClient'
import {
    apolloClientWrapper,
    adminUser,
    newSubmissionInput,
    rateFormData,
    contractFormData,
    minnesotaStatePrograms, CMSUserType, eqroFromData, AdminUserType,
} from '../utils/apollo-test-utils'
import { ApolloClient, DocumentNode, NormalizedCacheObject } from '@apollo/client'
import { CMSUserLoginNames, userLoginData } from './loginCommands'

export type ApiCreateOAuthClientResponseType = {
    client: OauthClient
    clientUser: CmsUsersUnion
    delegatedUser: CmsUsersUnion
}

const createAndSubmitContractOnlyPackage = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<Contract> => {
    const newContract = await apolloClient.mutate({
        mutation: CreateContractDocument,
        variables: {
            input: newSubmissionInput(),
        }
    })

    const draftContract = newContract.data.createContract.contract
    const draftRevision = draftContract.draftRevision
    const updateFormData = contractFormData({
        submissionType: 'CONTRACT_ONLY'
    })

    const updateContractDraftRevisionInput: UpdateContractDraftRevisionInput = {
        contractID: draftContract.id,
        lastSeenUpdatedAt: draftRevision.updatedAt,
        formData: updateFormData
    }

    await apolloClient.mutate({
        mutation: UpdateContractDraftRevisionDocument,
        variables: {
            input: updateContractDraftRevisionInput
        }
    })

    const submission = await apolloClient.mutate({
        mutation: SubmitContractDocument,
        variables: {
            input: {
                contractID: draftContract.id,
            },
        },
    })

    return submission.data.submitContract.contract
}

const createAndSubmitEQROContract = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<Contract> => {
    const newContract = await apolloClient.mutate({
        mutation: CreateContractDocument,
        variables: {
            input: newSubmissionInput({
                populationCovered: 'MEDICAID',
                programIDs: [minnesotaStatePrograms[0].id],
                managedCareEntities: ['MCO'],
                submissionType: 'CONTRACT_ONLY',
                riskBasedContract: false,
                submissionDescription: 'Test EQRO submission',
                contractType: 'BASE',
                contractSubmissionType: 'EQRO',
            }),
        },
    })

    const draftContract = newContract.data.createContract.contract
    const draftRevision = draftContract.draftRevision
    const updateFormData = eqroFromData()

    const updateContractDraftRevisionInput: UpdateContractDraftRevisionInput = {
        contractID: draftContract.id,
        lastSeenUpdatedAt: draftRevision.updatedAt,
        formData: updateFormData,
    }

    await apolloClient.mutate({
        mutation: UpdateContractDraftRevisionDocument,
        variables: {
            input: updateContractDraftRevisionInput,
        },
    })

    const submission = await apolloClient.mutate({
        mutation: SubmitContractDocument,
        variables: {
            input: {
                contractID: draftContract.id,
            },
        },
    })

    return submission.data.submitContract.contract
}

const createAndSubmitContractWithRates = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<Contract> => {
    const newContract = await apolloClient.mutate({
        mutation: CreateContractDocument,
        variables: {
            input: newSubmissionInput(),
        }
    })

    const draftContract = newContract.data.createContract.contract
    const draftRevision = draftContract.draftRevision
    const updateFormData = contractFormData({
        submissionType: 'CONTRACT_AND_RATES'
    })

    const updateContractDraftRevisionInput: UpdateContractDraftRevisionInput = {
        contractID: draftContract.id,
        lastSeenUpdatedAt: draftRevision.updatedAt,
        formData: updateFormData
    }

    const updatedContract = await apolloClient.mutate({
        mutation: UpdateContractDraftRevisionDocument,
        variables: {
            input: updateContractDraftRevisionInput
        }
    })

    const updatedDraftRevision = updatedContract.data.updateContractDraftRevision.contract.draftRevision

    const updateDraftContractRatesInput: UpdateDraftContractRatesInput = {
        contractID: draftContract.id,
        lastSeenUpdatedAt: updatedDraftRevision.updatedAt,
        updatedRates: [
            {
                formData: rateFormData({
                    rateDateStart: '2025-06-01',
                    rateDateEnd: '2026-05-30',
                    rateDateCertified: '2025-04-15',
                    rateProgramIDs: [minnesotaStatePrograms[0].id]
                }),
                rateID: undefined,
                type: 'CREATE'
            },
            {
                formData: rateFormData({
                    rateDateStart: '2024-03-01',
                    rateDateEnd: '2025-04-30',
                    rateDateCertified: '2025-03-15',
                    rateProgramIDs: [minnesotaStatePrograms[1].id]
                }),
                rateID: undefined,
                type: 'CREATE'
            }
        ]
    }

    await apolloClient.mutate({
        mutation: UpdateDraftContractRatesDocument,
        variables: {
            input: updateDraftContractRatesInput
        }
    })

    const submission = await apolloClient.mutate({
        mutation: SubmitContractDocument,
        variables: {
            input: {
                contractID: draftContract.id,
            },
        },
    })

    return submission.data.submitContract.contract
}

const assignCmsDivision = async (
    apolloClient: ApolloClient<NormalizedCacheObject>,
    cmsUser: CmsUsersUnion,
    division: Division
): Promise<void> => {
    // get all users query
    const result = await apolloClient.query({
        query: IndexUsersDocument,
    })

    const users = result.data.indexUsers.edges.map(
        (edge: UserEdge) => edge.node
    )

    // Find user
    const user = users.find((user: User) => user.email === cmsUser.email)

    if (!user) {
        throw new Error(
            `assignCmsDivision: CMS user ${cmsUser.email} not found`
        )
    }

    // assign division mutation
    await apolloClient.mutate({
        mutation: UpdateDivisionAssignmentDocument,
        variables: {
            input: {
                cmsUserID: user.id,
                divisionAssignment: division,
            },
        },
    })
}

const fetchUser = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<User> => {
    // To seed, we just need to perform a graphql query and the api will add the user to the db
    const user = await apolloClient.query({
        query: FetchCurrentUserDocument,
    })

    if (user.errors) {
        throw new Error(
            `Error: Could not seed user into DB: ${JSON.stringify(user.errors)}`
        )
    }

    if (!user.data.fetchCurrentUser) {
        throw new Error('Error: Seeding user into DB did not return user data in response.')
    }

    return user.data.fetchCurrentUser
}

const createOAuthClient = async (
    apolloClient: ApolloClient<NormalizedCacheObject>,
    oauthClientUser: CMSUserLoginNames,
    delegatedUser?: CMSUserLoginNames
): Promise<ApiCreateOAuthClientResponseType> => {
    const indexUsersRes = await apolloClient.query<IndexUsersQuery>({
        query: IndexUsersDocument,
    })

    if (indexUsersRes.errors) {
        throw new Error(
            `Error: Could not retrieve index users to for createOAuthClient. ${JSON.stringify(indexUsersRes.errors)}`
        )
    }

    const indexUsers = indexUsersRes.data.indexUsers.edges.map(
        (edge) => edge.node
    )

    const apiUser = indexUsers.find(
        (user) => user?.email === userLoginData[oauthClientUser].email
    )

    if (!apiUser) {
        throw new Error(
            `Could not find oauthClientUser ${oauthClientUser}, from DB. Try logging it with the user before calling createOAuthClient command.`
        )
    }

    if (apiUser.role !== 'CMS_USER' && apiUser.role !== 'CMS_APPROVER_USER') {
        throw new Error(
            'User for OAuth client creation from DB was not a CMS_USER or CMS_APPROVER_USER'
        )
    }

    const apiDelegatedUser = delegatedUser && indexUsers.find(
        (user) => user?.email === userLoginData[delegatedUser].email
    )

    if (delegatedUser && !apiDelegatedUser) {
        throw new Error(
            `Could not find delegatedUser, ${delegatedUser}, from DB. Try logging it with the user before calling createOAuthClient command.`
        )
    }

    if (
        delegatedUser &&
        apiDelegatedUser &&
        apiDelegatedUser.role !== 'CMS_USER' &&
        apiDelegatedUser.role !== 'CMS_APPROVER_USER'
    ) {
        throw new Error(
            'Delegated user from DB was not a CMS_USER or CMS_APPROVER_USER'
        )
    }

    const oauthClientResponse = await apolloClient.mutate({
        mutation: CreateOauthClientDocument,
        variables: {
            input: {
                description: 'Cypress integration test',
                userID: apiUser.id,
            },
        },
    })

    if (oauthClientResponse.errors) {
        throw new Error(
            `Error: Could not create OAuth client for user: ${JSON.stringify(oauthClientResponse.errors)}`
        )
    }

    const oauthClient = oauthClientResponse.data.createOauthClient.oauthClient

    if (!oauthClient) {
        throw new Error(
            `Error: Creating new OAuth client returned with no data or errors.`
        )
    }

    return {
        client: oauthClient,
        clientUser: apiUser as CmsUsersUnion,
        delegatedUser: apiDelegatedUser as CmsUsersUnion
    }
}

Cypress.Commands.add(
    'apiCreateAndSubmitContractOnlySubmission',
    (stateUser): Cypress.Chainable<Contract> =>
        cy.task<DocumentNode>('readGraphQLSchema').then({ timeout: 30000 },(schema) =>
            apolloClientWrapper(
                schema,
                stateUser,
                createAndSubmitContractOnlyPackage
            )
        )
)

Cypress.Commands.add(
    'apiCreateAndSubmitEQROSubmission',
    (stateUser): Cypress.Chainable<Contract> =>
        cy
            .task<DocumentNode>('readGraphQLSchema')
            .then({ timeout: 30000 }, (schema) =>
                apolloClientWrapper(
                    schema,
                    stateUser,
                    createAndSubmitEQROContract
                )
            )
)

Cypress.Commands.add(
    'apiCreateAndSubmitContractWithRates',
    (stateUser): Cypress.Chainable<Contract> =>
        cy.task<DocumentNode>('readGraphQLSchema').then({ timeout: 30000 },(schema) =>
            apolloClientWrapper(
                schema,
                stateUser,
                createAndSubmitContractWithRates
            )
        )
)

Cypress.Commands.add(
    'apiAssignDivisionToCMSUser',
    (cmsUser: CMSUserType, division: Division): Cypress.Chainable<void> =>
        cy
            .task<DocumentNode>('readGraphQLSchema')
            .then({ timeout: 30000 }, (schema) =>
                cy
                    .wrap(apolloClientWrapper(schema, cmsUser, fetchUser), {
                        timeout: 30000,
                    })
                    .then(() =>
                        apolloClientWrapper(
                            schema,
                            adminUser(),
                            (apolloClient) =>
                                assignCmsDivision(
                                    apolloClient,
                                    cmsUser,
                                    division
                                )
                        )
                    )
            )
)

Cypress.Commands.add(
    'apiCreateOAuthClient',
    (
        adminUser: AdminUserType,
        oauthClientUser: CMSUserLoginNames,
        delegatedUser?: CMSUserLoginNames
    ): Cypress.Chainable<ApiCreateOAuthClientResponseType> =>
        cy
            .task<DocumentNode>('readGraphQLSchema')
            .then({ timeout: 30000 }, (schema) =>
                apolloClientWrapper(schema, adminUser, (apolloClient) =>
                    createOAuthClient(
                        apolloClient,
                        oauthClientUser,
                        delegatedUser
                    )
                )
            )
)
