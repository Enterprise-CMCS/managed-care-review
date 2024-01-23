import { findAllRatesWithHistoryBySubmitInfo } from './findAllRatesWithHistoryBySubmitInfo'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { mockInsertRateArgs, must } from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftRate } from './insertRate'
import { submitRate } from './submitRate'
import { unlockRate } from './unlockRate'

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

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })

        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'one rate',
        })

        // make two submitted rates and submit them
        const rateOne = must(await insertDraftRate(client, draftRateData))
        const rateTwo = must(await insertDraftRate(client, draftRateData))
        const submittedRateOne = must(
            await submitRate(client, {
                rateID: rateOne.id,
                submittedByUserID: stateUser.id,
                submitReason: 'rateOne submit',
            })
        )
        const submittedRateTwo = must(
            await submitRate(client, {
                rateID: rateTwo.id,
                submittedByUserID: stateUser.id,
                submitReason: 'rateTwo submit',
            })
        )

        // make two draft rates
        const draftRateOne = must(await insertDraftRate(client, draftRateData))
        const draftRateTwo = must(await insertDraftRate(client, draftRateData))

        // make one unlocked rate
        const rateThree = must(await insertDraftRate(client, draftRateData))
        must(
            await submitRate(client, {
                rateID: rateThree.id,
                submittedByUserID: stateUser.id,
                submitReason: 'unlockRateOne submit',
            })
        )
        const unlockedRate = must(
            await unlockRate(client, {
                rateID: rateThree.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock unlockRateOne',
            })
        )

        // call the find by submit info function
        const rates = must(await findAllRatesWithHistoryBySubmitInfo(client))

        // expect our two submitted rates
        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: submittedRateOne.id,
                }),
                expect.objectContaining({
                    rateID: submittedRateTwo.id,
                }),
            ])
        )

        // expect our one unlocked rate
        expect(rates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: unlockedRate.id,
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

        const rateDataForAS = must(
            await insertDraftRate(
                client,
                mockInsertRateArgs({
                    stateCode: 'AS',
                    rateCertificationName: 'one rate',
                })
            )
        )
        const submittedRateAmericanSamoa = must(
            await submitRate(client, {
                rateID: rateDataForAS.id,
                submittedByUserID: stateUser.id,
                submitReason: 'rateOne submit',
            })
        )

        // call the find by submit info function
        const rates = must(await findAllRatesWithHistoryBySubmitInfo(client))

        // expect our AS rate to not be in the results
        expect(rates).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: submittedRateAmericanSamoa.id,
                }),
            ])
        )
    })
})
