import { findAllRatesWithHistoryBySubmitInfo } from './findAllRatesWithHistoryBySubmitInfo'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    mockInsertContractArgs,
    mockInsertRateArgs,
    must,
} from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftRate } from './insertRate'
import { insertDraftContract } from './insertContract'
import { submitContract } from './submitContract'
import { unlockContract } from './unlockContract'

describe('findAllRatesWithHistoryBySubmittedInfo', () => {
    it('returns only rates that have been submitted or unlocked', async () => {
        const client = await sharedTestPrismaClient()
        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'one rate',
        })

        // make two submitted rates and submit them
        const rateOne = must(
            await insertDraftRate(client, contractA.id, draftRateData)
        )
        const rateTwo = must(
            await insertDraftRate(client, contractA.id, draftRateData)
        )

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.1',
            })
        )

        must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: stateUser.id,
                unlockReason: 'Unlock A.1',
            })
        )

        // make two draft rates
        const draftRateOne = must(
            await insertDraftRate(client, contractA.id, draftRateData)
        )
        const draftRateTwo = must(
            await insertDraftRate(client, contractA.id, draftRateData)
        )

        // call the find by submit info function
        const rates = must(await findAllRatesWithHistoryBySubmitInfo(client))

        // expect our two submitted rates
        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: rateOne.id,
                }),
                expect.objectContaining({
                    rateID: rateTwo.id,
                }),
            ])
        )

        // expect our two draft rates to not be in the results
        expect(rates).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: draftRateOne.id,
                }),
                expect.objectContaining({
                    rateID: draftRateTwo.id,
                }),
            ])
        )
    })

    it('does not return rates from production test state (American Samoa)', async () => {
        const client = await sharedTestPrismaClient()
        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        const rateDataForAS = must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({
                    stateCode: 'AS',
                    rateCertificationName: 'one rate',
                })
            )
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.1',
            })
        )
        // call the find by submit info function
        const rates = must(await findAllRatesWithHistoryBySubmitInfo(client))

        // expect our AS rate to not be in the results
        expect(rates).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: rateDataForAS.id,
                }),
            ])
        )
    })

    it('can return rates only for a specific state if stateCode passed in', async () => {
        const client = await sharedTestPrismaClient()
        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        const rateDataForMN = must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({
                    stateCode: 'MN',
                    rateCertificationName: 'one rate',
                })
            )
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.1',
            })
        )

        // call the find by submit info function
        const rates = must(
            await findAllRatesWithHistoryBySubmitInfo(client, {stateCode: 'MN'})
        )

        // expect our MN rate to not be in the results
        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: rateDataForMN.id,
                }),
            ])
        )
    })
})
