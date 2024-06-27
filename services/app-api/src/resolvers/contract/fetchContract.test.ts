import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'

import FETCH_CONTRACT from '../../../../app-graphql/src/queries/fetchContract.graphql'
import type { RateType } from '../../domain-models'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { addNewRateToTestContract } from '../../testHelpers/gqlRateHelpers'
import { testS3Client } from '../../testHelpers'

describe('fetchContract', () => {
    const mockS3 = testS3Client()

    it('fetches the draft contract and a new child rate', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const stateSubmission =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        const fetchDraftContractResult = await stateServer.executeOperation({
            query: FETCH_CONTRACT,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchDraftContractResult.errors).toBeUndefined()

        const draftRate = fetchDraftContractResult.data?.fetchContract.contract
            .draftRates as RateType[]

        //check that we have a rate that is returned and is in DRAFT
        expect(draftRate).toHaveLength(1)
        expect(draftRate[0].status).toBe('DRAFT')
        expect(draftRate[0].stateCode).toBe('FL')
        expect(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            draftRate[0].draftRevision?.formData.rateDocuments![0].downloadURL
        ).toBeDefined()
    })

    it('gets the right contract name', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const stateSubmission =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        const fetchDraftContractResult = await stateServer.executeOperation({
            query: FETCH_CONTRACT,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchDraftContractResult.errors).toBeUndefined()

        const draftContract =
            fetchDraftContractResult.data?.fetchContract.contract.draftRevision

        expect(draftContract.contractName).toMatch(/MCR-FL-\d{4}-MMA/)
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

        await unlockTestHealthPlanPackage(cmsServer, AID, 'Unlock A.0')
        await submitTestContract(stateServer, AID, 'Submit A.1')

        await unlockTestHealthPlanPackage(cmsServer, AID, 'Unlock A.1')
        await submitTestContract(stateServer, AID, 'Submit A.2')

        await unlockTestHealthPlanPackage(cmsServer, AID, 'Unlock A.2')
        await submitTestContract(stateServer, AID, 'Submit A.3')

        await unlockTestHealthPlanPackage(cmsServer, AID, 'Unlock A.3')
        await submitTestContract(stateServer, AID, 'Submit A.4')

        const submittedMultiply = await fetchTestContract(stateServer, AID)

        expect(submittedMultiply.packageSubmissions).toHaveLength(5)

        expect(submittedMultiply.initiallySubmittedAt).toBeTruthy()
        expect(submittedMultiply.initiallySubmittedAt).toEqual(
            intiallySubmitted.initiallySubmittedAt
        )

        await unlockTestHealthPlanPackage(cmsServer, AID, 'Unlock A.4')

        const finallyUnlocked = await fetchTestContract(stateServer, AID)
        expect(finallyUnlocked.packageSubmissions).toHaveLength(5)

        expect(finallyUnlocked.initiallySubmittedAt).toBeTruthy()
        expect(finallyUnlocked.initiallySubmittedAt).toEqual(
            intiallySubmitted.initiallySubmittedAt
        )
    })

    it('errors if the wrong state user calls it', async () => {
        const stateServerFL = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a submission with a rate
        const stateSubmission =
            await createAndUpdateTestHealthPlanPackage(stateServerFL)

        const stateServerVA = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
        })

        const fetchResult = await stateServerVA.executeOperation({
            query: FETCH_CONTRACT,
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
})
