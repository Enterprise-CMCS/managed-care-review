import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import SUBMIT_CONTRACT from '../../../../app-graphql/src/mutations/submitContract.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'
import type { SubmitContractInput } from '../../gen/gqlServer'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
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

    it('handles a submission with multiple connections', async () => {
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
            'user not authorized to create state data'
        )
    })
})
