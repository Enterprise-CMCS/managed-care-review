import {
    CreateHealthPlanPackageDocument,
    HealthPlanPackage,
    SubmitHealthPlanPackageDocument,
    UpdateHealthPlanFormDataDocument,
    IndexUsersDocument,
    UserEdge,
    User,
    UpdateCmsUserDocument,
    FetchCurrentUserDocument,
    UpdateDraftContractRatesDocument,
    Contract,
    SubmitContractDocument,
    UpdateDraftContractRatesInput,
} from '../gen/gqlClient'
import {
    domainToBase64,
    base64ToDomain,
} from '../../app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    apolloClientWrapper,
    DivisionType,
    adminUser,
    deprecatedContractOnlyData,
    newSubmissionInput,
    rateFormData,
    CMSUserType, minnesotaStatePrograms,
} from '../utils/apollo-test-utils'
import { ApolloClient, DocumentNode, NormalizedCacheObject } from '@apollo/client'
import {UnlockedHealthPlanFormDataType} from 'app-web/src/common-code/healthPlanFormDataType';

const deprecatedCreateSubmitHPP = async (
    apolloClient: ApolloClient<NormalizedCacheObject>,
    formData?: Partial<UnlockedHealthPlanFormDataType>
): Promise<HealthPlanPackage> => {
    const newSubmission = await apolloClient.mutate({
        mutation: CreateHealthPlanPackageDocument,
        variables: {
            input: newSubmissionInput(),
        },
    })

    const pkg = newSubmission.data.createHealthPlanPackage.pkg
    const revision = pkg.revisions[0].node

    const initialFormData = base64ToDomain(revision.formDataProto)
    if (formData instanceof Error) {
        throw new Error(formData.message)
    }

    const fullFormData = {
        ...initialFormData,
        ...formData? formData: deprecatedContractOnlyData(),
    }

    const formDataProto = domainToBase64(fullFormData as UnlockedHealthPlanFormDataType)

    await apolloClient.mutate({
        mutation: UpdateHealthPlanFormDataDocument,
        variables: {
            input: {
                healthPlanFormData: formDataProto,
                pkgID: pkg.id,
            },
        },
    })

    const submission = await apolloClient.mutate({
        mutation: SubmitHealthPlanPackageDocument,
        variables: {
            input: {
                pkgID: pkg.id,
                submittedReason: 'Submit package for Q&A Tests',
            },
        },
    })

    return submission.data.submitHealthPlanPackage.pkg
}

const createAndSubmitBaseContract = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<Contract> => {

    // we don't have createContract yet so have to use HPP API here
    const newContract = await apolloClient.mutate({
        mutation: CreateHealthPlanPackageDocument,
        variables: {
            input: newSubmissionInput(),
        },
    })
    const contractID = newContract.data.createHealthPlanPackage.pkg.id

    const fullSubmissionData= {
        id: contractID,
        ...contractOnlyData,
    }

    await apolloClient.mutate({
        mutation: UpdateDraftContractRatesDocument,
        variables: {
            input: {

            contractID,
            },
        },
    })

    const submission1 = await apolloClient.mutate({
        mutation: SubmitContractDocument,
        variables: {
            input: {
                pkgID: contractOnlyData(),
                submittedReason: 'Submit package for Rates Dashboard tests',
            },
        },
    })
    return submission1.data.submitContract.contract
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
    'apiDeprecatedCreateSubmitHPP',
    (stateUser): Cypress.Chainable<HealthPlanPackage> =>
        cy.task<DocumentNode>('readGraphQLSchema').then((schema) =>
            apolloClientWrapper(
                schema,
                stateUser,
                deprecatedCreateSubmitHPP
            )
        )
)


Cypress.Commands.add(
    'apiCreateAndSubmitBaseContract',
    (stateUser): Cypress.Chainable<Contract> =>
        cy.task<DocumentNode>('readGraphQLSchema').then((schema) =>
            apolloClientWrapper(
                schema,
                stateUser,
                createAndSubmitBaseContract
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
