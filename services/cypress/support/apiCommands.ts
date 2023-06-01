import {Amplify, Auth as AmplifyAuth} from 'aws-amplify'
import {ApolloClient, HttpLink, InMemoryCache} from '@apollo/client';
import {
    UnlockedHealthPlanFormDataType
} from '../../app-web/src/common-code/healthPlanFormDataType';
import {
    CreateHealthPlanPackageDocument, HealthPlanPackage,
    SubmitHealthPlanPackageDocument,
    UpdateHealthPlanFormDataDocument
} from '../gen/gqlClient';
import { domainToBase64, base64ToDomain } from '../../app-web/src/common-code/proto/healthPlanFormDataProto';
import { fakeAmplifyFetch } from '../utils/amplify-fetch-test-utils';

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

const createAndSubmitPackage = async (schema: string): Promise<HealthPlanPackage> => {

    // Configure Amplify using envs set in cypress.config.ts
    Amplify.configure({
        Auth: {
            mandatorySignIn: true,
            region: Cypress.env('COGNITO_REGION'),
            userPoolId:  Cypress.env('USER_POOL_ID'),
            identityPoolId:  Cypress.env('IDENTITY_POOL_ID'),
            userPoolWebClientId:  Cypress.env('USER_POOL_WEB_CLIENT_ID'),
        },
        API: {
            endpoints: [
                {
                    name: 'api',
                    endpoint: Cypress.env('API_URL')
                },
            ],
        },
    })

    const authMode = Cypress.env('AUTH_MODE')

    const currentUser = {
        id: 'user1',
        email: 'aang@example.com',
        givenName: 'Aang',
        familyName: 'Avatar',
        role: 'STATE_USER',
        stateCode: 'MN',
    }

    const httpLinkConfig= {
        uri: '/graphql',
        headers: authMode === 'LOCAL' ? {
            'cognito-authentication-provider': JSON.stringify(currentUser)
        } : undefined,
        fetch: fakeAmplifyFetch,
        fetchOptions: {
            mode: 'no-cors'
        }
    }

    // If using cognito auth, then log in as a state user before graphql requests. Otherwise, configure apollo for local api requests
    if (authMode !== 'LOCAL') {
        await AmplifyAuth.signIn('aang@example.com', Cypress.env('TEST_USERS_PASS'))
    }

    const apolloClient = new ApolloClient({
        link: new HttpLink(httpLinkConfig),
        cache: new InMemoryCache({
            possibleTypes: {
                Submission: ['DraftSubmission', 'StateSubmission'],
            },
        }),
        typeDefs: schema as string,
    })

    const newSubmission = await apolloClient.mutate({
        mutation: CreateHealthPlanPackageDocument,
        variables: {
            input: newSubmissionInput
        },
        fetchPolicy: 'no-cache'
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
        fetchPolicy: 'no-cache'
    })

    const submission = await apolloClient.mutate({
        mutation: SubmitHealthPlanPackageDocument,
        variables: {
            input: {
                pkgID: pkg.id,
                submittedReason: 'Submit package for Q&A Tests'
            }
        },
        fetchPolicy: 'no-cache'
    })

    const submittedPkg: HealthPlanPackage = submission.data.submitHealthPlanPackage.pkg

    if (authMode !== 'LOCAL') {
        AmplifyAuth.signOut()
    }

    return submittedPkg
}

Cypress.Commands.add('apiCreateAndSubmitContractOnlySubmission', (): Cypress.Chainable<HealthPlanPackage> => {
    // Call readGraphQLSchema to get gql schema
    return cy.task('readGraphQLSchema').then(schema => createAndSubmitPackage(schema as string))
})
