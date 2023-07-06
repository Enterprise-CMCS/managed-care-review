import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'
import { insertDraftRate } from './insertRate'
import { submitRate } from './submitRate'
import { updateDraftRate } from './updateDraftRate'
import { must } from '../../testHelpers'

describe('submitContract', () => {
    it('creates a submission from a draft', async () => {
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
        expect(
            await submitContract(client, '1111', '1111', 'failed submit')
        ).toBeInstanceOf(Error)

        // create a draft contract
        const contractA = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'one contract',
            })
        )
        // submit the draft contract
        const result = must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        )
        expect(result.revisions[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )
        // resubmitting should be an error
        expect(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        ).toBeInstanceOf(Error)
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

        // create a draft contract
        const contractA = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'first contract',
            })
        )

        // create a draft rate
        const rateA = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                name: 'first rate',
            })
        )

        // submit the first draft contract
        const submittedContractA = must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        )

        // submit the first draft rate
        must(
            await submitRate(
                client,
                rateA.id,
                stateUser.id,
                'initial rate submit'
            )
        )
        // set up the relation between the submitted contract and the rate
        await client.rateRevisionsOnContractRevisionsTable.create({
            data: {
                contractRevisionID: submittedContractA.revisions[0].id,
                rateRevisionID: rateA.revisions[0].id,
                validAfter: new Date(),
            },
        })

        // create a second draft contract
        const contractASecondRevision = must(
            await client.contractTable.update({
                where: {
                    id: contractA.id,
                },
                data: {
                    revisions: {
                        create: {
                            id: uuidv4(),
                            submissionType: 'CONTRACT_AND_RATES',
                            submissionDescription: 'second contract revision',
                        },
                    },
                },
                include: {
                    revisions: true,
                },
            })
        )

        // submit the second draft contract
        must(
            await submitContract(
                client,
                contractASecondRevision.id,
                stateUser.id,
                'second submit'
            )
        )

        /* now that the second contract revision has been submitted, the first contract revision should be invalidated.
        Something is invalidated when it gets a validUntil value, which marks the time it stopped being valid */
        const invalidatedRevision = must(
            await client.rateRevisionsOnContractRevisionsTable.findFirst({
                where: {
                    contractRevisionID: submittedContractA.revisions[0].id,
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

        const contractA = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'one contract',
            })
        )

        // Attempt to submit a rate related to this draft contract
        const rate1 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                name: 'onepoint0',
            })
        )
        must(
            await updateDraftRate(client, rate1.id, 'onepoint0', [contractA.id])
        )
        const result = await submitRate(
            client,
            rate1.id,
            stateUser.id,
            'Rate Submit'
        )

        if (!(result instanceof Error)) {
            throw new Error('must be an error')
        }
        expect(result.message).toBe(
            'Attempted to submit a rate related to a contract that has not been submitted'
        )
    })
})
