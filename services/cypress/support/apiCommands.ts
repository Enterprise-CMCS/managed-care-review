import {
    IndexUsersDocument,
    UserEdge,
    User,
    UpdateCmsUserDocument,
    FetchCurrentUserDocument,
    UpdateDraftContractRatesDocument,
    UpdateDraftContractRatesInput,
    Contract,
    SubmitContractDocument,
    CreateContractDocument,
    UpdateContractDraftRevisionDocument,
    UpdateContractDraftRevisionInput,
} from '../gen/gqlClient'
import {
    apolloClientWrapper,
    DivisionType,
    adminUser,
    newSubmissionInput,
    rateFormData,
    contractFormData,
    CMSUserType, 
    minnesotaStatePrograms,
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
    cmsUser: CMSUserType,
    division: DivisionType
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
        mutation: UpdateCmsUserDocument,
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
): Promise<void> => {
    // To seed, we just need to perform a graphql query and the api will add the user to the db
    await apolloClient.query({
        query: FetchCurrentUserDocument,
    })
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
    'apiCreateAndSubmitBaseContract',
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
    'apiAssignDivisionToCMSUser',
    (cmsUser, division): Cypress.Chainable<void> =>
        cy.task<DocumentNode>('readGraphQLSchema').then((schema) =>
            cy.wrap(apolloClientWrapper(schema, cmsUser, seedUserIntoDB)).then(() =>
                cy.wrap(apolloClientWrapper(schema, adminUser(), (apolloClient) =>
                        assignCmsDivision(apolloClient, cmsUser, division)
                    )
                )
            )
        )
)
