import {
    UnlockedHealthPlanFormDataType
} from '../../app-web/src/common-code/healthPlanFormDataType';
import {
    CreateHealthPlanPackageDocument, HealthPlanPackage, StateUser,
    SubmitHealthPlanPackageDocument,
    UpdateHealthPlanFormDataDocument,
} from '../gen/gqlClient';
import { domainToBase64, base64ToDomain } from '../../app-web/src/common-code/proto/healthPlanFormDataProto';
import { apolloClientWrapper } from '../utils/apollo-test-utils';

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

const stateUser: StateUser = {
    id: 'user1',
    email: 'aang@example.com',
    givenName: 'Aang',
    familyName: 'Avatar',
    role: 'STATE_USER',
    state: {
        code: 'MN',
        name: 'Minnesota',
        programs: []
    },
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

Cypress.Commands.add('apiCreateAndSubmitContractOnlySubmission', (): Cypress.Chainable<HealthPlanPackage> => {
    // Call readGraphQLSchema to get gql schema
    return cy.task('readGraphQLSchema').then(schema => createAndSubmitPackage(schema as string))
})
