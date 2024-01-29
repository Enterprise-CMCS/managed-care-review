import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitRate } from './submitRate'
import { NotFoundError } from '../postgresErrors'
import { mockInsertContractArgs, mockInsertRateArgs,  must } from '../../testHelpers'
import { insertDraftRate } from './insertRate'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'
import { updateDraftContractWithRates } from './updateDraftContractWithRates'
import type { RateFormEditable } from './updateDraftRate'
import { unlockRate } from './unlockRate'
import { findContractWithHistory } from './findContractWithHistory'
import { findStatePrograms } from '../state'
import { unlockContract } from './unlockContract'

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
            submittedReason: 'failed submit',
        })
        expect(submitError).toBeInstanceOf(NotFoundError)

        // create a draft rate
        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'rate-cert-name',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))
        // submit the draft contract
        const result = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Initial submission',
                formData: {
                    ...draftRateData,
                    rateType: 'AMENDMENT',
                },
            })
        )

        // Expect default submit reason
        expect(result.revisions[0].submitInfo?.updatedReason).toBe(
            'Initial submission'
        )

        // Expect rate form data to be what was inserted
        expect(result.revisions[0]).toEqual(
            expect.objectContaining({
                formData: expect.objectContaining({
                    rateCertificationName: 'rate-cert-name',
                    rateType: 'AMENDMENT',
                }),
            })
        )

        const resubmitStoreError = await submitRate(client, {
            rateID: rateA.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'Resubmit',
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
        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'first rate ',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))

        // create a draft contract
        const contractA = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'first contract',
                })
            )
        )

        // submit the first draft rate with no associated contracts
        const submittedRateA = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        // submit the contract
        const contractA1 = must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial rate submit',
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
                submittedReason: 'second submit',
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

        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'one contract',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))

        if (!rateA.draftRevision) {
            throw new Error(
                'Unexpected error: No draft rate revision found in draft rate'
            )
        }

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
                rateFormDatas: [rateA.draftRevision?.formData],
            })
        )

        const result = await submitContract(client, {
            contractID: contract1.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'Contract Submit',
        })

        if (!(result instanceof Error)) {
            throw new Error('must be an error')
        }

        expect(result.message).toBe(
            'Attempted to submit a contract related to a rate that has not been submitted.'
        )
    })
    it('submits rate with updates', async () => {
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
        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'first rate ',
        })
        const draftRate = must(await insertDraftRate(client, draftRateData))

        if (!draftRate.draftRevision) {
            throw new Error(
                'Unexpected error: No draft rate revision in draft rate'
            )
        }

        const rateID = draftRate.draftRevision.rate.id

        const statePrograms = must(findStatePrograms(draftRate.stateCode))

        const updateRateData: RateFormEditable = {
            ...draftRate.draftRevision.formData,
            rateType: 'NEW',
            rateID,
            rateCertificationName: 'testState-123',
            rateProgramIDs: [statePrograms[0].id],
            rateCapitationType: 'RATE_CELL',
            rateDateStart: new Date('2024-01-01'),
            rateDateEnd: new Date('2025-01-01'),
            rateDateCertified: new Date('2024-01-01'),
            amendmentEffectiveDateEnd: new Date('2024-02-01'),
            amendmentEffectiveDateStart: new Date('2025-02-01'),
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            certifyingActuaryContacts: [],
            addtlActuaryContacts: [],
            supportingDocuments: [
                {
                    name: 'rate supporting doc',
                    s3URL: 'fakeS3URL',
                    sha256: '2342fwlkdmwvw',
                },
                {
                    name: 'rate supporting doc 2',
                    s3URL: 'fakeS3URL',
                    sha256: '45662342fwlkdmwvw',
                },
            ],
            rateDocuments: [
                {
                    name: 'contract doc',
                    s3URL: 'fakeS3URL',
                    sha256: '8984234fwlkdmwvw',
                },
            ],
        }

        const submittedRate = must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit and update rate',
                formData: updateRateData,
            })
        )

        expect(submittedRate.revisions[0].formData).toEqual(
            expect.objectContaining(updateRateData)
        )
    })
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
            updatedDraftContract.draftRevision.rateRevisions[0].rate.id

        // submit rate
        const submittedRate = must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit and update rate',
                formData: {
                    rateCertificationName: 'rate revision 1.1',
                    rateType: 'AMENDMENT',
                },
            })
        )

        // expect submitted rate not to have error.
        expect(submittedRate).not.toBeInstanceOf(Error)

        const fetchedDraftContract = must(
            await findContractWithHistory(client, contractID)
        )

        if (!fetchedDraftContract.draftRevision) {
            throw new Error(
                'Unexpected error: draft revision not found in draft contract'
            )
        }

        // expect updated and submitted rate revision to be on draft contract revision
        expect(
            fetchedDraftContract.draftRevision.rateRevisions[0].formData
        ).toEqual(
            expect.objectContaining({
                rateCertificationName: 'rate revision 1.1',
                rateType: 'AMENDMENT',
            })
        )

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
                rateCertificationName: 'rate revision 1.1',
                rateType: 'AMENDMENT',
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
            await unlockContract(client, {
                contractID: draftContract.id,
                unlockReason: 'dosmsdfs',
                unlockedByUserID: cmsUser.id,
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
