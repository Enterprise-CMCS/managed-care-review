import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'
import { insertDraftRate } from './insertRate'
import { submitRate } from './submitRate'
import { updateDraftRate } from './updateDraftRate'
import {
    must,
    mockInsertContractArgs,
    mockInsertRateArgs,
} from '../../testHelpers'
import { NotFoundError } from '../postgresErrors'
import { updateDraftContractWithRates } from './updateDraftContractWithRates'

describe('submitContract', () => {
    it('has the same submit infos', async () => {
        const client = await sharedTestPrismaClient()

        // setup the state user
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

        // create the draft contract
        const draftContractForm1 = mockInsertContractArgs({})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { stateCode, ...draftContractFormData } = draftContractForm1
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        // another contract form for an update
        const draftContractForm2 = {
            ...draftContractFormData,
            submissionDescription: 'something else',
        }

        // create a draft rate
        const draftRateDataA = mockInsertRateArgs({
            rateCertificationName: 'rate-cert-name',
        })

        const draftRateDataB = mockInsertRateArgs({
            rateCertificationName: 'rate-cert-number-two',
        })

        const draftContractWithRates = must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: draftContractForm2,
                rateFormDatas: [draftRateDataA, draftRateDataB],
            })
        )

        // submit the draft contract and connect submitInfos
        const result = must(
            await submitContract(client, {
                contractID: draftContractWithRates.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        expect(result.status).toBe('SUBMITTED')

        // check that they have the same submitInfos
        const contractSubmitInfo = result.revisions[0].submitInfo
        const rateSubmitInfoA = result.revisions[0].rateRevisions[0].submitInfo
        const rateSubmitInfoB = result.revisions[0].rateRevisions[1].submitInfo
        expect(contractSubmitInfo).toBeDefined()
        expect(rateSubmitInfoA).toBeDefined()
        expect(rateSubmitInfoB).toBeDefined()
        expect(contractSubmitInfo).toEqual(rateSubmitInfoA)
        expect(contractSubmitInfo).toEqual(rateSubmitInfoB)
        expect(rateSubmitInfoA).toEqual(rateSubmitInfoB)
    })

    it('only submits a rate if it is in DRAFT', async () => {
        const client = await sharedTestPrismaClient()

        // setup the state user
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

        // create the draft contract
        const draftContractForm1 = mockInsertContractArgs({})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { stateCode, ...draftContractFormData } = draftContractForm1
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        // another contract form for an update
        const draftContractForm2 = {
            ...draftContractFormData,
            submissionDescription: 'something else',
        }

        // create a draft rate
        const draftRateDataA = mockInsertRateArgs({
            rateCertificationName: 'rate-cert-name',
        })

        // create another draft rate
        const draftRateDataB = mockInsertRateArgs({
            rateCertificationName: 'rate-cert-number-two',
        })

        const draftContractWithRates = must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: draftContractForm2,
                rateFormDatas: [draftRateDataA, draftRateDataB],
            })
        )

        expect(draftContractWithRates).toBeDefined()

        // satisfy typescript
        if (draftContractWithRates.draftRates === undefined) {
            throw new Error('The draft rates should have been inserted')
        }

        // submit the first rate
        const submittedRate = must(
            await submitRate(client, {
                rateID: draftContractWithRates.draftRates[0].id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate A',
            })
        )
        console.info(JSON.stringify(submittedRate, null, '  '))

        // submit the draft contract and connect submitInfo
        // the second rate will have the same submitInfo here
        // and the first rate will have a different submitInfo
        const result = must(
            await submitContract(client, {
                contractID: draftContractWithRates.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        expect(result.status).toBe('SUBMITTED')

        // check that they have the same submitInfos
        const contractSubmitInfo = result.revisions[0].submitInfo
        const rateSubmitInfoA = result.revisions[0].rateRevisions[0].submitInfo
        const rateSubmitInfoB = result.revisions[0].rateRevisions[1].submitInfo
        expect(contractSubmitInfo).toBeDefined()
        expect(rateSubmitInfoA).toBeDefined()
        expect(rateSubmitInfoB).toBeDefined()
        expect(contractSubmitInfo).toEqual(rateSubmitInfoB)

        // but rate A does not
        expect(rateSubmitInfoA?.updatedReason).toBe('submit rate A')
    })
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
        const submitError = await submitContract(client, {
            contractID: '1111',
            submittedByUserID: '1111',
            submittedReason: 'failed submit',
        })
        expect(submitError).toBeInstanceOf(NotFoundError)

        // create a draft contract
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )
        // submit the draft contract
        const result = must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )
        expect(result.revisions[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )

        //Expect contract form data to be what was inserted
        expect(result.revisions[0]).toEqual(
            expect.objectContaining({
                formData: expect.objectContaining({
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'one contract',
                    contractType: 'BASE',
                    programIDs: draftContractData.programIDs,
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                }),
            })
        )

        const resubmitStoreError = await submitContract(client, {
            contractID: contractA.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'initial submit',
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

        // create a draft contract
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'first contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        // create a draft rate
        const rateA = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'first rate',
            })
        )

        // submit the first draft contract
        const submittedContractA = must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        // submit the first draft rate
        const rateA1 = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial rate submit',
            })
        )
        // set up the relation between the submitted contract and the rate
        await client.rateRevisionsOnContractRevisionsTable.create({
            data: {
                contractRevisionID: submittedContractA.revisions[0].id,
                rateRevisionID: rateA1.revisions[0].id,
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
                            submissionType: 'CONTRACT_AND_RATES',
                            submissionDescription: 'second contract revision',
                            contractType: 'BASE',
                            programIDs: draftContractData.programIDs,
                            populationCovered: 'MEDICAID',
                            riskBasedContract: false,
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
            await submitContract(client, {
                contractID: contractASecondRevision.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'second submit',
            })
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

        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        // Attempt to submit a rate related to this draft contract
        const rate1 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'onepoint0',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate1.id,
                formData: { rateCertificationName: 'onepoint0' },
                contractIDs: [contractA.id],
            })
        )
        const result = await submitRate(client, {
            rateID: rate1.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'Rate Submit',
        })

        if (!(result instanceof Error)) {
            throw new Error('must be an error')
        }
        expect(result.message).toBe(
            'Attempted to submit a rate related to a contract that has not been submitted'
        )
    })
})
