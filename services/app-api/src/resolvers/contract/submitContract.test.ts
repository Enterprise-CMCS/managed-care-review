import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import SUBMIT_CONTRACT from '../../../../app-graphql/src/mutations/submitContract.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'
import type { SubmitContractInput } from '../../gen/gqlServer'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    fetchTestRateById,
} from '../../testHelpers/gqlRateHelpers'

describe('submitContract', () => {
    it('submits a contract', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createAndUpdateTestContractWithoutRates(stateServer)
        const draftWithRates = await addNewRateToTestContract(
            stateServer,
            draft
        )

        const draftRates = draftWithRates.draftRates

        expect(draftRates).toHaveLength(1)

        const contract = await submitTestContract(stateServer, draft.id)

        expect(contract.draftRevision).toBeNull()

        expect(contract.packageSubmissions).toHaveLength(1)

        const sub = contract.packageSubmissions[0]
        expect(sub.cause).toBe('CONTRACT_SUBMISSION')
        expect(sub.submitInfo.updatedReason).toBe('Initial submission')
        expect(sub.submittedRevisions).toHaveLength(2)
        expect(sub.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rateID = sub.rateRevisions[0].rate!.id
        const rate = await fetchTestRateById(stateServer, rateID)
        expect(rate.status).toBe('SUBMITTED')
    })

    it('handles a submission with a link', async () => {
        const stateServer = await constructTestPostgresServer()

        const contract1 = await createAndSubmitTestContractWithRate(stateServer)
        const rate1 = contract1.packageSubmissions[0].rateRevisions[0].rate
        if (!rate1) {
            throw new Error('NO RATE')
        }

        const draft2 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        await addLinkedRateToTestContract(stateServer, draft2, rate1.id)
        const contract2 = await submitTestContract(stateServer, draft2.id)

        expect(contract2.draftRevision).toBeNull()

        expect(contract2.packageSubmissions).toHaveLength(1)

        const sub = contract2.packageSubmissions[0]
        expect(sub.cause).toBe('CONTRACT_SUBMISSION')
        expect(sub.submitInfo.updatedReason).toBe('Initial submission')
        expect(sub.submittedRevisions).toHaveLength(1)
        expect(sub.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(sub.rateRevisions).toHaveLength(1)
    })

    it('calls create twice in a row', async () => {
        const stateServer = await constructTestPostgresServer()

        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        await addNewRateToTestContract(stateServer, draftA0)
        await addNewRateToTestContract(stateServer, draftA0)

        const final = await fetchTestContract(stateServer, AID)
        expect(final.draftRates).toHaveLength(1)
    })

    it('handles the first miro scenario', async () => {
        const stateServer = await constructTestPostgresServer()

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)

        await addNewRateToTestContract(stateServer, draftA010)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rate!.id
        const rate20 = subA0.rateRevisions[1]
        const TwoID = rate20.rate!.id

        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(stateServer, draftB0, OneID)    
        await addNewRateToTestContract(stateServer, draftB010)

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]
        const rate30 = subB0.rateRevisions[1]
        const ThreeID = rate30.rate!.id

        expect(subB0.rateRevisions[0].rate!.id).toBe(OneID)

        // 3. Submit C0 with Rate20 and Rate40
        const draftC0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftC020 = await addLinkedRateToTestContract(stateServer, draftC0, TwoID)
        await addNewRateToTestContract(stateServer, draftC020)

        const contractC0 = await submitTestContract(stateServer, draftC0.id)
        const subC0 = contractC0.packageSubmissions[0]
        const rate40 = subC0.rateRevisions[1]
        const FourID = rate40.rate!.id
        expect(subC0.rateRevisions[0].rate!.id).toBe(TwoID)

        // 4. Submit D0, contract only
        const draftD0 = await createAndUpdateTestHealthPlanPackage(
            stateServer,
            {
                rateInfos: [],
                submissionType: 'CONTRACT_ONLY',
                addtlActuaryContacts: [],
                addtlActuaryCommunicationPreference: undefined,
            }
        )

        const contractD0 = await submitTestContract(stateServer, draftD0.id)

        console.info(ThreeID, FourID, contractD0)

        throw new Error('NO Dice')
    })

    it('returns an error if a CMS user attempts to call submitContract', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const input: SubmitContractInput = {
            contractID: 'fake-id-12345',
            submittedReason: 'Test cms user calling state user func',
        }

        const res = await cmsServer.executeOperation({
            query: SUBMIT_CONTRACT,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'user not authorized to fetch state data'
        )
    })
})
