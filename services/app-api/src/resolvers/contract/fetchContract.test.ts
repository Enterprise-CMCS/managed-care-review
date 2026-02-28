import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { FetchContractDocument } from '../../gen/gqlClient'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    createTestContract,
    fetchTestContract,
    submitTestContract,
    unlockTestContract,
    updateTestContractDraftRevision,
} from '../../testHelpers/gqlContractHelpers'
import { addNewRateToTestContract } from '../../testHelpers/gqlRateHelpers'
import {
    mockGqlContractDraftRevisionFormDataInput,
    testS3Client,
} from '../../testHelpers'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'

describe('fetchContract', () => {
    const mockS3 = testS3Client()

    it('fetches the draft contract and a new child rate', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndUpdateTestContractWithRate(stateServer)

        const fetchedContract = await fetchTestContract(
            stateServer,
            contract.id
        )
        const draftRate = fetchedContract.draftRates ?? []
        //check that we have some rate data returned and the rate has correct
        expect(draftRate).toHaveLength(1)
        expect(draftRate[0].status).toBe('DRAFT')
        expect(draftRate[0].stateCode).toBe('FL')
        expect(
            draftRate[0].draftRevision?.formData.rateDocuments![0].downloadURL
        ).toBeDefined()

        // confirm that contractID on draft rate is correct, this is now overwritten in parseContract and needs to be checked
        expect(draftRate[0].parentContractID).toBe(fetchedContract.id)

        // validate correct contract submission
        expect(fetchedContract.contractSubmissionType).toBe('HEALTH_PLAN')
    })

    it('gets the right contract name', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const stateSubmission = await createTestContract(stateServer)

        const fetchDraftContractResult = await executeGraphQLOperation(
            stateServer,
            {
                query: FetchContractDocument,
                variables: {
                    input: {
                        contractID: stateSubmission.id,
                    },
                },
            }
        )

        expect(fetchDraftContractResult.errors).toBeUndefined()

        const draftContract =
            fetchDraftContractResult.data?.fetchContract.contract
        const draftContractRev = draftContract.draftRevision

        expect(draftContractRev.contractName).toMatch(/MCR-FL-\d{4}-NEMTMTM/)
        expect(draftContractRev.contractID).toBe(draftContract.id)
    })

    it('returns a stable initially submitted at', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            s3Client: mockS3,
        })

        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)
        await addNewRateToTestContract(stateServer, draftA010)

        const unsubmitted = await fetchTestContract(stateServer, AID)
        expect(unsubmitted.initiallySubmittedAt).toBeNull()

        const intiallySubmitted = await submitTestContract(stateServer, AID)

        await unlockTestContract(cmsServer, AID, 'Unlock A.0')
        await submitTestContract(stateServer, AID, 'Submit A.1')

        await unlockTestContract(cmsServer, AID, 'Unlock A.1')
        await submitTestContract(stateServer, AID, 'Submit A.2')

        await unlockTestContract(cmsServer, AID, 'Unlock A.2')
        await submitTestContract(stateServer, AID, 'Submit A.3')

        await unlockTestContract(cmsServer, AID, 'Unlock A.3')
        await submitTestContract(stateServer, AID, 'Submit A.4')

        const submittedMultiply = await fetchTestContract(stateServer, AID)

        expect(submittedMultiply.packageSubmissions).toHaveLength(5)

        expect(submittedMultiply.initiallySubmittedAt).toBeTruthy()
        expect(submittedMultiply.initiallySubmittedAt).toEqual(
            intiallySubmitted.initiallySubmittedAt
        )

        await unlockTestContract(cmsServer, AID, 'Unlock A.4')

        const finallyUnlocked = await fetchTestContract(stateServer, AID)
        expect(finallyUnlocked.packageSubmissions).toHaveLength(5)

        expect(finallyUnlocked.initiallySubmittedAt).toBeTruthy()
        expect(finallyUnlocked.initiallySubmittedAt).toEqual(
            intiallySubmitted.initiallySubmittedAt
        )
    })

    it('returns lastUpdatedForDisplay', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            s3Client: mockS3,
        })

        const draftA0 = await createTestContract(stateServer)
        const AID = draftA0.id

        const lastDate: Date = new Date(1900, 1, 1)

        const initialCreatedDate = draftA0.lastUpdatedForDisplay
        expect(initialCreatedDate.getTime()).not.toEqual(lastDate.getTime())

        const draftA1 = await updateTestContractDraftRevision(stateServer, AID)
        const updatedDraftDate = draftA1.lastUpdatedForDisplay
        expect(updatedDraftDate.getTime()).not.toEqual(
            initialCreatedDate.getTime()
        )

        const intiallySubmitted = await submitTestContract(stateServer, AID)
        const intiallySubmittedDate = intiallySubmitted.lastUpdatedForDisplay
        expect(intiallySubmittedDate).not.toBeNull()
        expect(intiallySubmittedDate.getTime()).not.toEqual(
            updatedDraftDate.getTime()
        )
        expect(intiallySubmittedDate.getTime()).not.toEqual(
            initialCreatedDate.getTime()
        )

        const unlocked = await unlockTestContract(cmsServer, AID, 'Unlock A.3')
        const unlockedDate = unlocked.lastUpdatedForDisplay
        expect(unlockedDate.getTime()).not.toEqual(
            intiallySubmittedDate.getTime()
        )

        const draftA2 = await updateTestContractDraftRevision(stateServer, AID)
        const unlockUpdateDate = draftA2.lastUpdatedForDisplay
        expect(unlockUpdateDate.getTime()).toEqual(unlockedDate.getTime())

        const secondSubmitted = await submitTestContract(
            stateServer,
            AID,
            'submit after unlock'
        )
        const secondSubmitDate = secondSubmitted.lastUpdatedForDisplay
        expect(secondSubmitDate.getTime()).not.toEqual(
            unlockUpdateDate.getTime()
        )

        const approved = await approveTestContract(cmsServer, AID)
        const approvedDate = approved.lastUpdatedForDisplay
        expect(approvedDate.getTime()).not.toEqual(secondSubmitDate.getTime())
    })

    it('returns dateContractDocsExecuted', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            s3Client: mockS3,
        })

        const draftA0 = await createTestContract(stateServer)
        const AID = draftA0.id

        expect(draftA0.dateContractDocsExecuted).toBeNull()

        const draft1FD = mockGqlContractDraftRevisionFormDataInput()
        draft1FD.contractExecutionStatus = 'UNEXECUTED'
        const draftA1 = await updateTestContractDraftRevision(
            stateServer,
            AID,
            draftA0.draftRevision?.updatedAt,
            draft1FD
        )
        expect(draftA1.dateContractDocsExecuted).toBeNull()

        const intiallySubmitted = await submitTestContract(stateServer, AID)
        expect(intiallySubmitted.dateContractDocsExecuted).toBeNull()

        const unlocked = await unlockTestContract(cmsServer, AID, 'Unlock A.3')
        expect(unlocked.dateContractDocsExecuted).toBeNull()

        const draft2FD = mockGqlContractDraftRevisionFormDataInput()
        draft2FD.contractExecutionStatus = 'EXECUTED'
        const draftA2 = await updateTestContractDraftRevision(
            stateServer,
            AID,
            unlocked.draftRevision.updatedAt,
            draft2FD
        )
        expect(draftA2.dateContractDocsExecuted).toBeNull()

        const secondSubmitted = await submitTestContract(
            stateServer,
            AID,
            'submit after unlock'
        )
        expect(secondSubmitted.dateContractDocsExecuted).not.toBeNull()

        const secondUnlock = await unlockTestContract(
            cmsServer,
            AID,
            'Unlock A.4'
        )
        expect(secondUnlock.dateContractDocsExecuted).not.toBeNull()

        const draft3FD = mockGqlContractDraftRevisionFormDataInput()
        draft3FD.contractExecutionStatus = 'UNEXECUTED'
        const draftA3 = await updateTestContractDraftRevision(
            stateServer,
            AID,
            secondUnlock.draftRevision.updatedAt,
            draft3FD
        )
        expect(draftA3.dateContractDocsExecuted).not.toBeNull()

        const thirdSubmitted = await submitTestContract(
            stateServer,
            AID,
            'submit removing the execution'
        )
        expect(thirdSubmitted.dateContractDocsExecuted).toBeNull()
    })

    it('returns dateContractDocsExecuted for initially executed', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const draftA0 = await createTestContract(stateServer)
        const AID = draftA0.id

        expect(draftA0.dateContractDocsExecuted).toBeNull()

        const draft1FD = mockGqlContractDraftRevisionFormDataInput()
        draft1FD.contractExecutionStatus = 'EXECUTED'
        const draftA1 = await updateTestContractDraftRevision(
            stateServer,
            AID,
            draftA0.draftRevision?.updatedAt,
            draft1FD
        )
        expect(draftA1.dateContractDocsExecuted).toBeNull()

        const intiallySubmitted = await submitTestContract(stateServer, AID)
        expect(intiallySubmitted.dateContractDocsExecuted).not.toBeNull()
    })

    it('returns webURL', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const draftA0 = await createTestContract(stateServer)
        const AID = draftA0.id

        const expectedURL = `https://localhost:3000/submissions/${ContractSubmissionTypeRecord[draftA0.contractSubmissionType]}/${AID}`

        expect(draftA0.webURL).toBe(expectedURL)
    })

    it('errors if the wrong state user calls it', async () => {
        const stateServerFL = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a submission with a rate
        const stateSubmission = await createTestContract(stateServerFL)

        const stateServerVA = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
        })

        const fetchResult = await executeGraphQLOperation(stateServerVA, {
            query: FetchContractDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors[0].message).toBe(
            'User from state VA not allowed to access contract from FL'
        )
    })

    it('allows OAuth client with client_credentials to fetch contract', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // Create OAuth client context
        const oauthServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(), // FL state user
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['client_credentials'],
                    issuer: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            s3Client: mockS3,
        })

        const fetchResult = await executeGraphQLOperation(oauthServer, {
            query: FetchContractDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchResult.errors).toBeUndefined()
        expect(fetchResult.data?.fetchContract.contract).toBeDefined()
        expect(fetchResult.data?.fetchContract.contract.id).toBe(
            stateSubmission.id
        )
    })

    it('denies OAuth client access to contract from different state', async () => {
        const stateServerFL = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract in FL
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServerFL)

        // Create OAuth client context with VA state user
        const oauthServerVA = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'oauth@va.gov',
                }),
                oauthClient: {
                    clientId: 'test-oauth-client-va',
                    grants: ['client_credentials'],
                    issuer: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            s3Client: mockS3,
        })

        const fetchResult = await executeGraphQLOperation(oauthServerVA, {
            query: FetchContractDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors[0].message).toBe(
            'OAuth client not allowed to access contract from FL'
        )
    })

    it('denies OAuth client without read permissions', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // Create OAuth client context without client_credentials grant
        const oauthServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(),
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['some_other_grant'],
                    issuer: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            s3Client: mockS3,
        })

        const fetchResult = await executeGraphQLOperation(oauthServer, {
            query: FetchContractDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors[0].message).toBe(
            'OAuth client does not have read permissions'
        )
    })
})
