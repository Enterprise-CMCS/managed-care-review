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
import { GraphQLError, print } from 'graphql'
import { CMSUserLoginNames, userLoginData } from './loginCommands'
import { GenerateUploadUrlDocument } from '@mc-review/constants/build/gen/gqlClient'

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

    const contractDocumentURL = await apolloClient.mutate({
        mutation: GenerateUploadUrlDocument,
        variables: {
            input: {
                fileName: 'trussel-guide.pdf',
                fileType: 'PDF'
            },
        },
    })

    const uploadResult = contractDocumentURL.data!.generateUploadURL

    const s3URL = `s3://${uploadResult.bucket}/${uploadResult.s3Key}/trussel-guide.pdf`
    const res = await fetch(uploadResult.uploadURL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
        },
        body: new Blob(['trussel-guide.pdf'], { type: 'application/pdf' }),
      })
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`)
      }
    updateFormData.contractDocuments = [
        {
            name: 'trussel-guide.pdf',
            s3URL,
            sha256: 'abc123',
        },
    ]

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

const requestOAuthToken = (
    oauthClient: OauthClient
): Cypress.Chainable<string> => {
    const url = Cypress.env('API_URL')
    const tokenUrl = `${url}/oauth/token`

    return cy.request({
        url: tokenUrl,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: oauthClient.clientId,
            client_secret: oauthClient.clientSecret,
        }).toString(),
        failOnStatusCode: false,
    }).then((response) => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(
                `OAuth token request failed with status ${response.status}: ${JSON.stringify(response.body)}`
            )
        }

        const token = response.body.access_token

        if (!token) {
            throw new Error('OAuth token response did not contain an access_token')
        }

        return token
    })
}

export type ThirdPartyApiRequestInput = {
    token: string
    document: DocumentNode
    delegatedUserId?: string
    variables?: Record<string, unknown>
}

export type ThirdPartyApiRequestOutput<TData = unknown> = {
    status: number
    data: TData
    errors?: GraphQLError[]
}

const thirdPartyApiRequest = <TData>(
    input: ThirdPartyApiRequestInput
): Cypress.Chainable<ThirdPartyApiRequestOutput<TData>> => {
    const url = Cypress.env('API_URL')
    const apiUrl = `${url}/v1/graphql/external`

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.token}`,
    }

    if (input.delegatedUserId) {
        headers['x-acting-as-user'] = input.delegatedUserId
    }

    return cy.request({
        url: apiUrl,
        method: 'POST',
        headers,
        body: {
            query: print(input.document),
            variables: input.variables,
        },
        failOnStatusCode: false,
    }).then((response): ThirdPartyApiRequestOutput<TData> => {
        return { status: response.status, data: response.body.data, errors: response.body.errors }
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

// Command to request a OAuth token
Cypress.Commands.add(
    'apiRequestOAuthToken',
    (oauthClient: OauthClient): Cypress.Chainable<string> =>
        requestOAuthToken(oauthClient)
)

// Command for third party API requests using any query, mutation and delegated user request.
Cypress.Commands.add(
    'thirdPartyApiRequest',
    (
        input: ThirdPartyApiRequestInput
    ): Cypress.Chainable<ThirdPartyApiRequestOutput> =>
        thirdPartyApiRequest(input)
)
