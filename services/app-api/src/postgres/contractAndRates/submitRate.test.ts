import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitRate } from './submitRate'
import {
    mockInsertContractArgs,
    mockInsertRateArgs,
    must,
} from '../../testHelpers'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'
import { updateDraftContractWithRates } from './updateDraftContractWithRates'
import { unlockRate } from './unlockRate'

describe('submitRate', () => {
    it('submits rate independent of contract status', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = must(
            await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Aang',
                    familyName: 'Avatar',
                    email: 'aang@example.com',
                    role: 'STATE_USER',
                    stateCode: 'NM',
                },
            })
        )

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })

        // create a draft contract
        const draftContract = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'first contract',
                })
            )
        )

        const contractID = draftContract.id

        // add new rate to contract
        const updatedDraftContract = must(
            await updateDraftContractWithRates(client, {
                contractID,
                formData: {},
                rateFormDatas: [
                    mockInsertRateArgs({
                        rateCertificationName: 'rate revision 1.0',
                        rateType: 'NEW',
                    }),
                ],
            })
        )

        if (!updatedDraftContract.draftRevision) {
            throw new Error(
                'Unexpected error: draft revision not found in draft contract'
            )
        }

        const rateID =
            updatedDraftContract.draftRevision.rateRevisions[0].rateID

        const submittedContract = must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit first contract',
            })
        )

        // expect updated and submitted rate revision to be on submitted contract revision
        expect(
            submittedContract.revisions[0].rateRevisions[0].formData
        ).toEqual(
            expect.objectContaining({
                rateCertificationName: 'rate revision 1.0',
                rateType: 'NEW',
            })
        )

        // Rate should be able to unlock and resubmitted
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'some reason',
            })
        )

        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit and update rate',
                formData: {
                    rateCertificationName: 'rate revision 1.2',
                    rateType: 'AMENDMENT',
                    rateCapitationType: 'RATE_CELL',
                },
            })
        )
    })
})
