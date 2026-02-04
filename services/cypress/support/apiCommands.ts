import {
    IndexUsersDocument,
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
    minnesotaStatePrograms, CMSUserType, eqroFromData, StateUserType, AdminUserType,
} from '../utils/apollo-test-utils'
import { ApolloClient, DocumentNode, NormalizedCacheObject } from '@apollo/client'

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

const seedUserIntoDB = async (
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
    oauthClientUser: CMSUserType
): Promise<OauthClient> => {
    const oauthClient = await apolloClient.mutate({
        mutation: CreateOauthClientDocument,
        variables: {
            input: {
                description: 'Cypress integration test',
                userID: oauthClientUser.id,
            }
        },
    })

    if (oauthClient.errors) {
        throw new Error(
            `Error: Could not create OAuth client for user: ${JSON.stringify(oauthClient.errors)}`
        )
    }

    if (!oauthClient.data.createOauthClient.oauthClient) {
        throw new Error(
            `Error: Creating new OAuth client returned with no data or errors.`
        )
    }

    return oauthClient.data.createOauthClient.oauthClient
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
        cy.task<DocumentNode>('readGraphQLSchema').then( { timeout: 30000 },(schema) =>
            cy.wrap(apolloClientWrapper(schema, cmsUser, seedUserIntoDB), { timeout: 30000 } ).then(() =>
                apolloClientWrapper(schema, adminUser(), (apolloClient) =>
                    assignCmsDivision(apolloClient, cmsUser, division)
                )
            )
        )
)

Cypress.Commands.add(
    'apiCreateOAuthClient',
    (
        adminUser: AdminUserType,
        oauthClientUser: CMSUserType
    ): Cypress.Chainable<OauthClient> =>
        cy
            .task<DocumentNode>('readGraphQLSchema')
            .then({ timeout: 30000 }, (schema) =>
                apolloClientWrapper(
                    schema,
                    adminUser,
                    (apolloClient) => createOAuthClient(apolloClient, oauthClientUser)
                )
            )
)
