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
} from '../gen/gqlClient'
import {
    domainToBase64,
    base64ToDomain,
} from '../../app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    apolloClientWrapper,
    DivisionType,
    adminUser,
    contractOnlyData,
    contractAndRatesData,
    newSubmissionInput,
    CMSUserType,
} from '../utils/apollo-test-utils'
import { ApolloClient, DocumentNode, NormalizedCacheObject } from '@apollo/client'

const createAndSubmitContractOnlyPackage = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<HealthPlanPackage> => {
    const newSubmission = await apolloClient.mutate({
        mutation: CreateHealthPlanPackageDocument,
        variables: {
            input: newSubmissionInput(),
        },
    })

    const pkg = newSubmission.data.createHealthPlanPackage.pkg
    const revision = pkg.revisions[0].node

    const formData = base64ToDomain(revision.formDataProto)
    if (formData instanceof Error) {
        throw new Error(formData.message)
    }

    const fullFormData = {
        ...formData,
        ...contractOnlyData(),
    }

    const formDataProto = domainToBase64(fullFormData)

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

const createAndSubmitContractWithRates = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
): Promise<HealthPlanPackage> => {
    const newSubmission1 = await apolloClient.mutate({
        mutation: CreateHealthPlanPackageDocument,
        variables: {
            input: newSubmissionInput({submissionType: 'CONTRACT_AND_RATES'}),
        },
    })
    const pkg1 = newSubmission1.data.createHealthPlanPackage.pkg
    const pkg1FirstRev = pkg1.revisions[0].node

    const formData1 = base64ToDomain(pkg1FirstRev.formDataProto)
    if (formData1 instanceof Error) {
        throw new Error(formData1.message)
    }

    const fullFormData1 = {
        ...formData1,
        ...contractAndRatesData(),
    }

    const formDataProto = domainToBase64(fullFormData1)

    await apolloClient.mutate({
        mutation: UpdateHealthPlanFormDataDocument,
        variables: {
            input: {
                healthPlanFormData: formDataProto,
                pkgID: pkg1.id,
            },
        },
    })

    const submission1 = await apolloClient.mutate({
        mutation: SubmitHealthPlanPackageDocument,
        variables: {
            input: {
                pkgID: pkg1.id,
                submittedReason: 'Submit package for Rates Dashboard tests',
            },
        },
    })
    return submission1.data.submitHealthPlanPackage.pkg
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
    (stateUser): Cypress.Chainable<HealthPlanPackage> =>
        cy.task<DocumentNode>('readGraphQLSchema').then((schema) =>
            apolloClientWrapper(
                schema,
                stateUser,
                createAndSubmitContractOnlyPackage
            )
        )
)


Cypress.Commands.add(
    'apiCreateAndSubmitContractWithRates',
    (stateUser): Cypress.Chainable<HealthPlanPackage> =>
        cy.task<DocumentNode>('readGraphQLSchema').then((schema) =>
            apolloClientWrapper(
                schema,
                stateUser,
                createAndSubmitContractWithRates
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
