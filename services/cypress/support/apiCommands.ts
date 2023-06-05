import {
    UnlockedHealthPlanFormDataType
} from '../../app-web/src/common-code/healthPlanFormDataType';
import {
    CreateHealthPlanPackageDocument, HealthPlanPackage,
    SubmitHealthPlanPackageDocument,
    UpdateHealthPlanFormDataDocument,
    IndexUsersDocument, UserEdge, User, UpdateCmsUserDocument, FetchCurrentUserDocument
} from '../gen/gqlClient';
import { domainToBase64, base64ToDomain } from '../../app-web/src/common-code/proto/healthPlanFormDataProto';
import {
    apolloClientWrapper,
    StatUserType,
    CMSUserType,
    AdminUserType,
    DivisionType,
    UserType
} from '../utils/apollo-test-utils';

const contractOnlyData: Partial<UnlockedHealthPlanFormDataType> = {
    stateContacts: [
        {
            name: 'Name',
            titleRole: 'Title',
            email: 'example@example.com',
        },
    ],
    addtlActuaryContacts: [],
    documents: [],
    contractExecutionStatus: 'EXECUTED' as const,
    contractDocuments: [
        {
            name: 'Contract Cert.pdf',
            s3URL: 's3://local-uploads/1684382956834-Contract Cert.pdf/Contract Cert.pdf',
            documentCategories: ['CONTRACT'],
            sha256: 'abc123',
        },
    ],
    contractDateStart: new Date('2023-05-01T00:00:00.000Z'),
    contractDateEnd: new Date('2023-05-31T00:00:00.000Z'),
    contractAmendmentInfo: {
        modifiedProvisions: {
            inLieuServicesAndSettings: false,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: false,
            modifiedPaymentsForMentalDiseaseInstitutions: false,
            modifiedNonRiskPaymentArrangements: false,
        },
    },
    managedCareEntities: ['MCO'],
    federalAuthorities: ['STATE_PLAN'],
    rateInfos: [],
}

const newSubmissionInput = {
    populationCovered: 'MEDICAID',
    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
    submissionType: 'CONTRACT_ONLY',
    riskBasedContract: false,
    submissionDescription: 'Test Q&A',
    contractType: 'BASE',
}

const stateUser: StatUserType = {
    id: 'user1',
    email: 'aang@example.com',
    givenName: 'Aang',
    familyName: 'Avatar',
    role: 'STATE_USER',
    stateCode: 'MN',
}

const cmsUser: CMSUserType = {
    id: 'user3',
    email: 'zuko@example.com',
    givenName: 'Zuko',
    familyName: 'Hotman',
    role: 'CMS_USER',
    stateAssignments: []
}

const adminUser: AdminUserType = {
    id: 'user4',
    email: 'iroh@example.com',
    givenName: 'Iroh',
    familyName: 'Coldstart',
    role: 'ADMIN_USER'
}

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

const assignCmsDivision = async (schema: string, cmsUserEmail: string, division: DivisionType) => await apolloClientWrapper(schema, adminUser, async (apolloClient): Promise<void> => {
    // Seed cms user into db before assigning division
    await seedUserIntoDB(schema, cmsUser)

    // get all users query
    const result = await apolloClient.query({
        query: IndexUsersDocument,
    })

    // find zuko
    const users = result.data.indexUsers.edges.map((edge: UserEdge) => edge.node)
    const user = users.find((user: User) => user.email === cmsUserEmail)

    if (!user) {
        throw new Error(`assignCmsDivision: CMS user ${cmsUserEmail} not found`)
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

    cy.log(JSON.stringify(updatedCMSUser.data.updateCMSUser.user))
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

Cypress.Commands.add('apiAssignDivisionToCMSUser', (cmsUserEmail, division): Cypress.Chainable<void> => {
    return cy.task('readGraphQLSchema').then(schema => assignCmsDivision(schema as string, cmsUserEmail, division))
})
