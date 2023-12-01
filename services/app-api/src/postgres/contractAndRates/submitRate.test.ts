import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitRate } from './submitRate'
import { NotFoundError } from '../postgresErrors'
import { createInsertRateData } from '../../testHelpers/contractAndRates/rateHelpers'
import { createInsertContractData, must } from '../../testHelpers'
import { insertDraftRate } from './insertRate'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'
import { updateDraftContractWithRates } from './updateDraftContractWithRates'

describe('submitRate', () => {
    it('creates a standalone rate submission from a draft', async () => {
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

        // submitting before there's a draft should be an error
        const submitError = await submitRate(client, {
            rateID: '1111',
            submittedByUserID: '1111',
            submitReason: 'failed submit',
        })
        expect(submitError).toBeInstanceOf(NotFoundError)

        // create a draft rate
        const draftRateData = createInsertRateData({
            rateCertificationName: 'rate-cert-name',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))
        // submit the draft contract
        const result = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial submit',
            })
        )
        expect(result.revisions[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )

        //Expect rate form data to be what was inserted
        expect(result.revisions[0]).toEqual(
            expect.objectContaining({
                formData: expect.objectContaining({
                    rateCertificationName: 'rate-cert-name',
                }),
            })
        )

        const resubmitStoreError = await submitRate(client, {
            rateID: rateA.id,
            submittedByUserID: stateUser.id,
            submitReason: 'initial submit',
        })

        // resubmitting should be a store error
        expect(resubmitStoreError).toBeInstanceOf(NotFoundError)
    })

    it('invalidates old revisions when new revisions are submitted', async () => {
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

        // create a draft rate
        const draftRateData = createInsertRateData({
            rateCertificationName: 'first rate ',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))

        // create a draft contract
        const contractA = must(
            await insertDraftContract(
                client,
                createInsertContractData({
                    submissionDescription: 'first contract',
                })
            )
        )

        // submit the first draft rate with no associated contracts
        const submittedRateA = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial submit',
            })
        )

        // submit the contract
        const contractA1 = must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial rate submit',
            })
        )
        // set up the relation between the submitted contract and the rate
        await client.rateRevisionsOnContractRevisionsTable.create({
            data: {
                rateRevisionID: submittedRateA.revisions[0].id,
                contractRevisionID: contractA1.revisions[0].id,
                validAfter: new Date(),
            },
        })

        // create a second draft rate
        const rateASecondRevision = must(
            await client.rateTable.update({
                where: {
                    id: rateA.id,
                },
                data: {
                    revisions: {
                        create: {
                            rateCertificationName: 'second contract revision',
                        },
                    },
                },
                include: {
                    revisions: true,
                },
            })
        )

        // submit the second draft rate
        must(
            await submitRate(client, {
                rateID: rateASecondRevision.id,
                submittedByUserID: stateUser.id,
                submitReason: 'second submit',
            })
        )

        /* now that the second rate revision has been submitted, the first rate revision should be invalidated.
        Something is invalidated when it gets a validUntil value, which marks the time it stopped being valid */
        const invalidatedRevision = must(
            await client.rateRevisionsOnContractRevisionsTable.findFirst({
                where: {
                    rateRevisionID: submittedRateA.revisions[0].id,
                    validUntil: { not: null },
                },
            })
        )

        expect(invalidatedRevision).not.toBeNull()
    })

    it('handles concurrent drafts correctly', async () => {
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

        const draftRateData = createInsertRateData({
            rateCertificationName: 'one contract',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))

        // Attempt to submit a contract related to this draft rate
        const contract1 = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionDescription: 'onepoint0',
                contractType: 'BASE',
                submissionType: 'CONTRACT_AND_RATES',
                programIDs: ['test1'],
            })
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract1.id,
                formData: { submissionDescription: 'onepoint0' },
                rateFormDatas: [rateA],
            })
        )

        const result = await submitContract(client, {
            contractID: contract1.id,
            submittedByUserID: stateUser.id,
            submitReason: 'Contract Submit',
        })

        if (!(result instanceof Error)) {
            throw new Error('must be an error')
        }
        expect(result.message).toBe(
            'Attempted to submit a contract related to a rate that has not been submitted.'
        )
    })
})
