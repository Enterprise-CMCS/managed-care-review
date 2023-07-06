import { AxiosResponse } from 'axios'
import {
    ApolloClient,
    DocumentNode,
    HttpLink,
    InMemoryCache,
    NormalizedCacheObject,
} from '@apollo/client'
import { Amplify, Auth as AmplifyAuth, API } from 'aws-amplify'
import { UnlockedHealthPlanFormDataType } from '@managed-care-review/common-code/healthPlanFormDataType'

type StateUserType = {
    id: string
    email: string
    givenName: string
    familyName: string
    role: 'STATE_USER'
    stateCode: string
}

type CMSUserType = {
    id: string
    email: string
    givenName: string
    familyName: string
    role: 'CMS_USER'
    stateAssignments: []
}

type AdminUserType = {
    id: string
    email: string
    givenName: string
    familyName: string
    role: 'ADMIN_USER'
}

type DivisionType = 'DMCO' | 'DMCP' | 'OACT'

type UserType = StateUserType | AdminUserType | CMSUserType

const contractOnlyData = (): Partial<UnlockedHealthPlanFormDataType> => ({
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
})

const newSubmissionInput = (): Partial<UnlockedHealthPlanFormDataType> => ({
    populationCovered: 'MEDICAID',
    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
    submissionType: 'CONTRACT_ONLY',
    riskBasedContract: false,
    submissionDescription: 'Test Q&A',
    contractType: 'BASE',
})

const stateUser = (): StateUserType => ({
    id: 'user1',
    email: 'aang@example.com',
    givenName: 'Aang',
    familyName: 'Avatar',
    role: 'STATE_USER',
    stateCode: 'MN',
})

const cmsUser = (): CMSUserType => ({
    id: 'user3',
    email: 'zuko@example.com',
    givenName: 'Zuko',
    familyName: 'Hotman',
    role: 'CMS_USER',
    stateAssignments: [],
})

const adminUser = (): AdminUserType => ({
    id: 'user4',
    email: 'iroh@example.com',
    givenName: 'Iroh',
    familyName: 'Coldstart',
    role: 'ADMIN_USER',
})

// Configure Amplify using envs set in cypress.config.ts
Amplify.configure({
    Auth: {
        mandatorySignIn: true,
        region: Cypress.env('COGNITO_REGION'),
        userPoolId: Cypress.env('COGNITO_USER_POOL_ID'),
        identityPoolId: Cypress.env('COGNITO_IDENTITY_POOL_ID'),
        userPoolWebClientId: Cypress.env('COGNITO_USER_POOL_WEB_CLIENT_ID'),
    },
    API: {
        endpoints: [
            {
                name: 'api',
                endpoint: Cypress.env('API_URL'),
            },
        ],
    },
})

function fetchResponseFromAxios(axiosResponse: AxiosResponse): Response {
    const fakeFetchResponse: Response = {
        headers: new Headers({
            ok: axiosResponse.headers['ok'] || '',
            redirected: axiosResponse.headers['redirected'] || '',
            status: axiosResponse.headers['status'] || '',
            statusText: axiosResponse.headers['statusText'] || '',
            type: axiosResponse.headers['type'] || '',
            url: axiosResponse.headers['url'] || '',
        }),
        status: axiosResponse.status,
        ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
        statusText: axiosResponse.statusText,
        redirected: false,
        type: 'basic',
        url: axiosResponse.request.url,

        body: axiosResponse.data,

        // this appears to actually be called by apollo-client and matter
        text: () => {
            return new Promise<string>((resolve) => {
                resolve(JSON.stringify(axiosResponse.data))
            })
        },

        json: () => {
            return new Promise<string>((resolve) => {
                console.info('FAKE JSON')
                resolve(axiosResponse.data)
            })
        },

        formData: () => {
            return new Promise<FormData>((resolve) => {
                console.info('FAKE FORM DATA')
                resolve(axiosResponse.data)
            })
        },

        bodyUsed: false,
        blob: () => {
            throw new Error('never call blob')
        },
        arrayBuffer: () => {
            throw new Error('never call arrayBuffer')
        },

        clone: () => {
            throw new Error('never call clone')
        },
    }

    return fakeFetchResponse
}

// fakeAmplify Fetch looks like the API for fetch, but is secretly making an amplify request
// Apollo Link uses the ~fetch api for it's client-side middleware.
// Amplify.API uses axios undeneath and does its own transformation of the body, so we wrap that up here.
async function fakeAmplifyFetch(
    uri: string,
    options: RequestInit
): Promise<Response> {
    if (options.method !== 'POST') {
        throw new Error('unexpected GQL request')
    }

    let amplifyBody = {}
    if (options.body && typeof options.body === 'string') {
        amplifyBody = JSON.parse(options.body)
    }

    // Amplify sets its own content-type and accept headers
    // if we try and override the content-type it breaks the signature, so we need to delete them.
    // This is ugly. There might be a cleverer way to do this with typescript but I'm not sure
    // options.headers is of type HeaderInit | string[][] | Record<string, string>
    const headers: { [header: string]: string } = Object.assign(
        {},
        options.headers
    ) as { [header: string]: string }

    delete headers['accept']
    delete headers['content-type']

    const apiOptions = {
        response: true,
        body: amplifyBody,
        headers: headers,
    }

    return new Promise<Response>((resolve, reject) => {
        API.post('api', uri, apiOptions)
            .then((apiResponse: AxiosResponse) => {
                // The Apollo Link wants a fetch.Response shaped response,
                // not the axios shaped response that Amplify.API returns
                const fakeFetchResponse = fetchResponseFromAxios(apiResponse)
                resolve(fakeFetchResponse)
            })
            .catch((e) => {
                // AXIOS rejects non 200 responsese, but fetch does not.
                if (e.response) {
                    const fakeFetchResponse = fetchResponseFromAxios(e.response)
                    resolve(fakeFetchResponse)
                    return
                } else if (e.request) {
                    reject(e)
                } else {
                    reject(e)
                }
            })
    })
}

// Provides Amplify auth and apollo client to callback function.
const apolloClientWrapper = async <T>(
    schema: DocumentNode,
    authUser: UserType,
    callback: (apolloClient: ApolloClient<NormalizedCacheObject>) => Promise<T>
): Promise<T> => {
    const isLocalAuth = Cypress.env('AUTH_MODE') === 'LOCAL'

    const httpLinkConfig = {
        uri: '/graphql',
        headers: isLocalAuth
            ? {
                  'cognito-authentication-provider': JSON.stringify(authUser),
              }
            : undefined,
        fetch: fakeAmplifyFetch,
        fetchOptions: {
            mode: 'no-cors',
        },
    }

    const apolloClient: ApolloClient<NormalizedCacheObject> = new ApolloClient({
        link: new HttpLink(httpLinkConfig),
        cache: new InMemoryCache({
            possibleTypes: {
                Submission: ['DraftSubmission', 'StateSubmission'],
            },
        }),
        typeDefs: schema,
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'no-cache',
            },
        },
    })

    if (!isLocalAuth) {
        await AmplifyAuth.signIn(authUser.email, Cypress.env('TEST_USERS_PASS'))
    }

    const result = await callback(apolloClient)

    if (!isLocalAuth) {
        await AmplifyAuth.signOut()
    }

    return result
}

export {
    apolloClientWrapper,
    contractOnlyData,
    newSubmissionInput,
    cmsUser,
    adminUser,
    stateUser,
}
export type {
    StateUserType,
    CMSUserType,
    AdminUserType,
    UserType,
    DivisionType,
}
