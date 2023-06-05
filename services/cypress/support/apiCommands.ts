import {
    CreateHealthPlanPackageDocument, HealthPlanPackage,
    SubmitHealthPlanPackageDocument,
    UpdateHealthPlanFormDataDocument,
    IndexUsersDocument, UserEdge, User, UpdateCmsUserDocument, FetchCurrentUserDocument
} from '../gen/gqlClient';
import { domainToBase64, base64ToDomain } from '../../app-web/src/common-code/proto/healthPlanFormDataProto';
import {
    apolloClientWrapper,
    DivisionType,
    UserType,
    stateUser,
    adminUser,
    contractOnlyData,
    newSubmissionInput, CMSUserType
} from '../utils/apollo-test-utils';

const createAndSubmitPackage = async (schema: string)=> await apolloClientWrapper(schema, stateUser,async (apolloClient): Promise<HealthPlanPackage> => {
    const newSubmission = await apolloClient.mutate({
        mutation: CreateHealthPlanPackageDocument,
        variables: {
            input: newSubmissionInput
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
        ...contractOnlyData,
    }

    const formDataProto = domainToBase64(fullFormData)

    await apolloClient.mutate({
        mutation: UpdateHealthPlanFormDataDocument,
        variables: {
            input: {
                healthPlanFormData: formDataProto,
                pkgID: pkg.id
            }
        },
    })

    const submission = await apolloClient.mutate({
        mutation: SubmitHealthPlanPackageDocument,
        variables: {
            input: {
                pkgID: pkg.id,
                submittedReason: 'Submit package for Q&A Tests'
            }
        },
    })

    return submission.data.submitHealthPlanPackage.pkg
})

const assignCmsDivision = async (schema: string,cmsUser: CMSUserType, division: DivisionType) => await apolloClientWrapper(schema, adminUser, async (apolloClient): Promise<void> => {
    // get all users query
    const result = await apolloClient.query({
        query: IndexUsersDocument,
    })

    // find zuko
    const users = result.data.indexUsers.edges.map((edge: UserEdge) => edge.node)
    const user = users.find((user: User) => user.email === cmsUser.email)

    if (!user) {
        throw new Error(`assignCmsDivision: CMS user ${cmsUser.email} not found`)
    }

    // assign division mutation
    const updatedCMSUser = await apolloClient.mutate({
        mutation: UpdateCmsUserDocument,
        variables: {
            input: {
                cmsUserID: user.id,
                divisionAssignment: division
            }
        }
    })
})

const seedUserIntoDB = async (schema: string, user: UserType) => await apolloClientWrapper(schema, user,async (apolloClient): Promise<void> => {
    // To seed, we just need to perform a graphql query and the api will add the user to the db
    await apolloClient.query({
        query: FetchCurrentUserDocument
    })
})

Cypress.Commands.add('apiCreateAndSubmitContractOnlySubmission', (): Cypress.Chainable<HealthPlanPackage> => {
    return cy.task('readGraphQLSchema').then(schema => createAndSubmitPackage(schema as string))
})

Cypress.Commands.add('apiAssignDivisionToCMSUser', (cmsUser, division): Cypress.Chainable<void> => {
    return cy.task('readGraphQLSchema').then(schema =>
        cy.wrap(seedUserIntoDB(schema as string, cmsUser)).then(() =>
            cy.wrap(assignCmsDivision(schema as string, cmsUser, division))
        )
    )
})
