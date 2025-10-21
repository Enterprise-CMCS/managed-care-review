import { AxiosResponse } from 'axios'
import {
    ApolloClient,
    DocumentNode,
    HttpLink,
    InMemoryCache,
    NormalizedCacheObject,
} from '@apollo/client'
import {
    RateFormDataInput,
    ContractFormData,
    CreateContractInput,
} from '../gen/gqlClient'
import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
    AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider'
import {
    CognitoIdentityClient,
    GetIdCommand,
    GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity'
import { SignatureV4 } from '@aws-sdk/signature-v4'
import { HttpRequest } from '@aws-sdk/protocol-http'
import { Sha256 } from '@aws-crypto/sha256-js'
import { findStatePrograms } from '@mc-review/submissions';

// programs for state used in tests
const minnesotaStatePrograms = findStatePrograms('MN')

const s3DlUrl =
    'https://fake-bucket.s3.amazonaws.com/file.pdf?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Expires=1719564800&Signature=abc123def456ghijk' //pragma: allowlist secret

const contractFormData = (
    overrides?: Partial<ContractFormData>
): ContractFormData => ({
    programIDs: [minnesotaStatePrograms[0].id],
    populationCovered: 'MEDICAID',
    submissionType: 'CONTRACT_ONLY',
    riskBasedContract: false,
    submissionDescription: 'A submission description',
    stateContacts: [
        {
            name: 'Name',
            titleRole: 'Title',
            email: 'example@example.com',
        },
    ],
    supportingDocuments: [],
    contractType: 'BASE',
    contractExecutionStatus: 'EXECUTED',
    contractDocuments: [
        {
            name: 'Contract Cert.pdf',
            s3URL: 's3://local-uploads/1684382956834-Contract Cert.pdf/Contract Cert.pdf',
            sha256: 'abc123',
        },
    ],
    contractDateStart: '2023-05-01',
    contractDateEnd: '2024-05-31',
    managedCareEntities: ['MCO'],
    federalAuthorities: ['STATE_PLAN'],
    dsnpContract: false,
    inLieuServicesAndSettings: true,
    modifiedBenefitsProvided: true,
    modifiedGeoAreaServed: true,
    modifiedMedicaidBeneficiaries: true,
    modifiedRiskSharingStrategy: true,
    modifiedIncentiveArrangements: true,
    modifiedWitholdAgreements: true,
    modifiedStateDirectedPayments: true,
    modifiedPassThroughPayments: false,
    modifiedPaymentsForMentalDiseaseInstitutions: false,
    modifiedMedicalLossRatioStandards: false,
    modifiedOtherFinancialPaymentIncentive: false,
    modifiedEnrollmentProcess: false,
    modifiedGrevienceAndAppeal: false,
    modifiedNetworkAdequacyStandards: true,
    modifiedLengthOfContract: true,
    modifiedNonRiskPaymentArrangements: true,
    statutoryRegulatoryAttestation: false,
    statutoryRegulatoryAttestationDescription: 'No compliance',
    ...overrides,
})

const rateFormData = (
    data?: Partial<RateFormDataInput>
): RateFormDataInput => ({
    rateType: 'NEW',
    rateCapitationType: 'RATE_CELL',
    rateDocuments: [
        {
            name: 'rate1Document1.pdf',
            s3URL: 's3://local-uploads/1684382956834-rate1Document1.pdf/rate1Document1.pdf',
            sha256: 'fakesha',
            downloadURL: s3DlUrl,
        },
    ],
    supportingDocuments: [
        {
            name: 'rate1SupportingDocument1.pdf',
            s3URL: 's3://local-uploads/1684382956834-rate1SupportingDocument1.pdf/rate1SupportingDocument1.pdf',
            sha256: 'fakesha2',
            downloadURL: s3DlUrl,
        },
    ],
    rateDateStart: '2025-05-01',
    rateDateEnd: '2026-04-30',
    rateDateCertified: '2025-03-15',
    rateProgramIDs: [minnesotaStatePrograms[0].id],
    certifyingActuaryContacts: [
        {
            name: 'actuary1',
            titleRole: 'test title',
            email: 'email@example.com',
            actuarialFirm: 'MERCER' as const,
            actuarialFirmOther: '',
        },
    ],
    deprecatedRateProgramIDs: [],
    addtlActuaryContacts: [],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY' as const,
    ...data,
})

const newSubmissionInput = (
    overrides?: Partial<CreateContractInput>
): Partial<CreateContractInput> => {
    return Object.assign(
        {
            populationCovered: 'MEDICAID',
            programIDs: [minnesotaStatePrograms[0].id],
            submissionType: 'CONTRACT_ONLY',
            riskBasedContract: false,
            submissionDescription: 'Test Q&A',
            contractType: 'BASE',
        },
        overrides
    )
}

export type StateUserType = {
    id: string
    email: string
    givenName: string
    familyName: string
    role: 'STATE_USER'
    stateCode: string
}

export type CMSUserType = {
    id: string
    email: string
    givenName: string
    familyName: string
    role: 'CMS_USER'
    stateAssignments: []
}

export type AdminUserType = {
    id: string
    email: string
    givenName: string
    familyName: string
    role: 'ADMIN_USER'
}

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
    familyName: 'Uncle',
    role: 'ADMIN_USER',
})

class AuthAPIManager {
    private tokens: {
        accessToken: string
        idToken: string
        refreshToken: string
    } | null = null

    private cognitoIdentityProvider: CognitoIdentityProviderClient
    private cognitoIdentity: CognitoIdentityClient

    constructor() {
        this.cognitoIdentityProvider = new CognitoIdentityProviderClient({
            region: Cypress.env('COGNITO_REGION'),
            credentials: {
                accessKeyId: Cypress.env('AWS_ACCESS_KEY_ID'),
                secretAccessKey: Cypress.env('AWS_SECRET_ACCESS_KEY'),
                sessionToken: Cypress.env('AWS_SESSION_TOKEN')
            }
        })

        this.cognitoIdentity = new CognitoIdentityClient({
            region: Cypress.env('COGNITO_REGION'),
        })
    }

    async signIn(email: string, password: string) {
        const command = new AdminInitiateAuthCommand({
            AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
            UserPoolId: Cypress.env('COGNITO_USER_POOL_ID'),
            ClientId: Cypress.env('COGNITO_USER_POOL_WEB_CLIENT_ID'),
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        })

        const response = await this.cognitoIdentityProvider.send(command)

        if (!response.AuthenticationResult) {
            throw new Error('Auth: Authentication failed')
        }

        this.tokens = {
            accessToken: response.AuthenticationResult.AccessToken!,
            idToken: response.AuthenticationResult.IdToken!,
            refreshToken: response.AuthenticationResult.RefreshToken!,
        }

        return this.tokens
    }

    async signOut() {
        // Clear tokens and sessions
        this.tokens = null
        return Promise.resolve()
    }

    async post(path: string, options: any): Promise<AxiosResponse> {
        const apiUrl = Cypress.env('API_URL')

        // Parse API URL to get domain and full path
        const parsedApiUrl = new URL(apiUrl)
        const apiDomain = `${parsedApiUrl.protocol}//${parsedApiUrl.host}`
        const fullPath = `${parsedApiUrl.pathname.replace(/\/$/, '')}${path}`

        // Create request body and headers
        const body = JSON.stringify(options.body)

        const request = new HttpRequest({
            method: 'POST',
            hostname: parsedApiUrl.hostname,
            path: fullPath,
            headers: {
                'Content-Type': 'application/json',
                'Host': parsedApiUrl.hostname,
                ...options.headers,
            },
            body,
        })

        let response

        // If token is provided we sign the request headers
        if (this.tokens) {
            // Get AWS credentials from stored tokens
            const getIdCommand = new GetIdCommand({
                IdentityPoolId: Cypress.env('COGNITO_IDENTITY_POOL_ID'),
                Logins: {
                    [`cognito-idp.${Cypress.env('COGNITO_REGION')}.amazonaws.com/${Cypress.env('COGNITO_USER_POOL_ID')}`]: this.tokens.idToken,
                },
            })

            const { IdentityId } = await this.cognitoIdentity.send(getIdCommand)

            const getCredsCommand = new GetCredentialsForIdentityCommand({
                IdentityId,
                Logins: {
                    [`cognito-idp.${Cypress.env('COGNITO_REGION')}.amazonaws.com/${Cypress.env('COGNITO_USER_POOL_ID')}`]: this.tokens.idToken,
                },
            })

            const { Credentials } = await this.cognitoIdentity.send(getCredsCommand)

            const signer = new SignatureV4({
                service: 'execute-api',
                region: Cypress.env('COGNITO_REGION') ?? 'us-east-1',
                credentials: {
                    accessKeyId: Credentials!.AccessKeyId!,
                    secretAccessKey: Credentials!.SecretKey!,
                    sessionToken: Credentials!.SessionToken!,
                },
                sha256: Sha256,
            })

            const signedRequest = await signer.sign(request)

            response = await fetch(`${apiDomain}${fullPath}`, {
                method: 'POST',
                headers: signedRequest.headers,
                body,
            })
        } else {
            // fetch with unsigned request headers
            response = await fetch(`${apiDomain}${fullPath}`, request)
        }

        // Parse response safely
        let responseData
        const contentType = response.headers.get('content-type')

        if (contentType?.includes('application/json')) {
            const responseText = await response.text()
            try {
                responseData = JSON.parse(responseText)
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError, 'Response:', responseText)
                responseData = responseText
            }
        } else {
            responseData = await response.text()
        }

        // Convert to AxiosResponse format
        const headers: { [key: string]: string } = {}
        response.headers.forEach((value, key) => {
            headers[key] = value
        })

        return {
            data: responseData,
            status: response.status,
            statusText: response.statusText,
            headers,
            config: {},
            request: { url: `${apiDomain}${fullPath}` },
        } as AxiosResponse
    }
}

const AuthAPI = new AuthAPIManager()

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
        bytes: () => {
            throw new Error('fetchResponseFromAxios: never call bytes')
        },

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
// Amplify.API uses axios underneath and does its own transformation of the body, so we wrap that up here.
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
        AuthAPI.post(uri, apiOptions)
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
    authUser: StateUserType | CMSUserType | AdminUserType,
    callback: (apolloClient: ApolloClient<NormalizedCacheObject>) => Promise<T>
): Promise<T> => {
    const isLocalAuth = Cypress.env('AUTH_MODE') === 'LOCAL'

    const httpLinkConfig = {
        uri: '/graphql',
        headers: isLocalAuth
            ? {
                  'Cognito-Authentication-Provider': JSON.stringify(authUser),
              }
            : undefined,
        fetch: fakeAmplifyFetch,
        fetchOptions: {
            mode: 'no-cors',
        },
    }

    const apolloClient: ApolloClient<NormalizedCacheObject> = new ApolloClient({
        link: new HttpLink(httpLinkConfig),
        cache: new InMemoryCache(),
        typeDefs: schema,
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'no-cache',
            },
        },
    })

    if (!isLocalAuth) {
        await AuthAPI.signIn(authUser.email, Cypress.env('TEST_USERS_PASS'))
    }

    const result = await callback(apolloClient)

    if (!isLocalAuth) {
        await AuthAPI.signOut()
    }

    return result
}

export {
    apolloClientWrapper,
    newSubmissionInput,
    cmsUser,
    adminUser,
    stateUser,
    rateFormData,
    contractFormData,
    minnesotaStatePrograms
}
