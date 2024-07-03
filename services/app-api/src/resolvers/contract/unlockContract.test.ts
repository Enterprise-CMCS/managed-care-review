import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import UNLOCK_CONTRACT from '../../../../app-graphql/src/mutations/unlockContract.graphql'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'
import { expectToBeDefined } from '../../testHelpers/assertionHelpers'

import { testCMSUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createSubmitAndUnlockTestContract,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { addNewRateToTestContract } from '../../testHelpers/gqlRateHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

describe('unlockContract', () => {
    const mockS3 = testS3Client()
    const cmsUser = testCMSUser()
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    it('changes contract status to UNLOCKED and creates a new draft revision with unlock info', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
        })
        const draft = await createAndUpdateTestContractWithoutRates(stateServer)
        const draftWithRates = await addNewRateToTestContract(
            stateServer,
            draft
        )

        const draftRates = draftWithRates.draftRates

        expect(draftRates).toHaveLength(1)

        const contract = await submitTestContract(stateServer, draft.id)
        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'test unlock'
        )

        expect(unlockedContract.draftRevision).toBeDefined()

        expect(unlockedContract.status).toBe('UNLOCKED')

        if (!unlockedContract.draftRevision) {
            throw new Error('no draftrate')
        }
        if (!unlockedContract.draftRevision.unlockInfo) {
            throw new Error('no unlockinfo')
        }

        expect(unlockedContract.draftRevision.unlockInfo.updatedReason).toBe(
            'test unlock'
        )
    })

    it('returns status error if rate is actively being edited in draft', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
        })

        const contract = await createSubmitAndUnlockTestContract(
            stateServer,
            cmsServer
        )

        // Try to unlock the contract again
        const unlockResult2 = await cmsServer.executeOperation({
            query: UNLOCK_CONTRACT,
            variables: {
                input: {
                    contractID: contract.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expectToBeDefined(unlockResult2.errors)
        expect(unlockResult2.errors[0].message).toBe(
            'Attempted to unlock contract with wrong status'
        )
    })

    it('returns unauthorized error for state user', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const unlockResult = await stateServer.executeOperation({
            query: UNLOCK_CONTRACT,
            variables: {
                input: {
                    contractID: contract.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expectToBeDefined(unlockResult.errors)
        expect(unlockResult.errors[0].message).toBe(
            'user not authorized to unlock contract'
        )
    })
})
