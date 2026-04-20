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

    it('returns only rates matching the provided rateIDs', async () => {
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

        const contractA = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'one contract',
                })
            )
        )

        const rateOne = must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({ rateCertificationName: 'rate one' })
            )
        )
        const rateTwo = must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({ rateCertificationName: 'rate two' })
            )
        )
        must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({ rateCertificationName: 'rate three' })
            )
        )

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting rates',
            })
        )

        const rates = must(
            await findAllRatesWithHistoryBySubmitInfo(client, {
                rateIDs: [rateOne.id, rateTwo.id],
            })
        )

        expect(rates).toHaveLength(2)
        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ rateID: rateOne.id }),
                expect.objectContaining({ rateID: rateTwo.id }),
            ])
        )
    })

    it('returns no rates when updatedSince is in the future', async () => {
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

        const contractA = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'one contract',
                })
            )
        )
        must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({ rateCertificationName: 'a rate' })
            )
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting',
            })
        )

        const farFuture = new Date('2099-01-01')
        const rates = must(
            await findAllRatesWithHistoryBySubmitInfo(client, {
                updatedSince: farFuture,
            })
        )

        expect(rates).toHaveLength(0)
    })

    it('returns submitted rates when updatedSince is in the past', async () => {
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

        const contractA = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'one contract',
                })
            )
        )
        const rate = must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({ rateCertificationName: 'a rate' })
            )
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting',
            })
        )

        const farPast = new Date('2000-01-01')
        const rates = must(
            await findAllRatesWithHistoryBySubmitInfo(client, {
                updatedSince: farPast,
            })
        )

        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ rateID: rate.id }),
            ])
        )
    })

    it('returns a rate after unlock and resubmit when updatedSince is set between the two submissions', async () => {
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

        const contractA = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'one contract',
                })
            )
        )
        const rate = must(
            await insertDraftRate(
                client,
                contractA.id,
                mockInsertRateArgs({ rateCertificationName: 'a rate' })
            )
        )

        // First submission
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Initial submission',
            })
        )

        // Set cutoff timestamp between the two submissions
        const cutoff = new Date()

        // Unlock and resubmit — this creates a new revision and submitInfo row,
        // but does NOT touch RateTable.updatedAt, so the OR filter on revisions
        // is what catches it
        must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: stateUser.id,
                unlockReason: 'Making a change',
            })
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Resubmission after unlock',
            })
        )

        const rates = must(
            await findAllRatesWithHistoryBySubmitInfo(client, {
                updatedSince: cutoff,
            })
        )

        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ rateID: rate.id }),
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
            await findAllRatesWithHistoryBySubmitInfo(client, {
                stateCode: 'MN',
            })
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
