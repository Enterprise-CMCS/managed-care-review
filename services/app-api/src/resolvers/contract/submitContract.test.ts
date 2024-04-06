import UPDATE_DRAFT_CONTRACT_RATES from 'app-graphql/src/mutations/updateDraftContractRates.graphql'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import SUBMIT_CONTRACT from '../../../../app-graphql/src/mutations/submitContract.graphql'
import SUBMIT_RATE from '../../../../app-graphql/src/mutations/submitRate.graphql'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'

import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import type { Contract, Rate, SubmitContractInput } from '../../gen/gqlServer'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    fetchTestRateById,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
    updateTestRate,
} from '../../testHelpers/gqlRateHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

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

    it('handles a submission with a link', async () => {
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

    it('calls create twice in a row', async () => {
        const stateServer = await constructTestPostgresServer()

        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        await addNewRateToTestContract(stateServer, draftA0)
        await addNewRateToTestContract(stateServer, draftA0)

        const final = await fetchTestContract(stateServer, AID)
        expect(final.draftRates).toHaveLength(1)
    })

    it('handles the first miro scenario', async () => {
        const stateServer = await constructTestPostgresServer()

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)

        await addNewRateToTestContract(stateServer, draftA010)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rate!.id
        const rate20 = subA0.rateRevisions[1]
        const TwoID = rate20.rate!.id

        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(
            stateServer,
            draftB0,
            OneID
        )
        await addNewRateToTestContract(stateServer, draftB010)

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]
        const rate30 = subB0.rateRevisions[1]
        const ThreeID = rate30.rate!.id

        expect(subB0.rateRevisions[0].rate!.id).toBe(OneID)

        // 3. Submit C0 with Rate20 and Rate40
        const draftC0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftC020 = await addLinkedRateToTestContract(
            stateServer,
            draftC0,
            TwoID
        )
        await addNewRateToTestContract(stateServer, draftC020)

        const contractC0 = await submitTestContract(stateServer, draftC0.id)
        const subC0 = contractC0.packageSubmissions[0]
        const rate40 = subC0.rateRevisions[1]
        const FourID = rate40.rate!.id
        expect(subC0.rateRevisions[0].rate!.id).toBe(TwoID)

        // 4. Submit D0, contract only
        const draftD0 = await createAndUpdateTestHealthPlanPackage(
            stateServer,
            {
                rateInfos: [],
                submissionType: 'CONTRACT_ONLY',
                addtlActuaryContacts: [],
                addtlActuaryCommunicationPreference: undefined,
            }
        )
        const contractD0 = await submitTestContract(stateServer, draftD0.id)

        console.info(ThreeID, FourID, contractD0)
    })

    it('handles unlock and editing rates', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        console.log('1.')
        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)

        await addNewRateToTestContract(stateServer, draftA010)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rate!.id

        console.log('2.')
        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(
            stateServer,
            draftB0,
            OneID
        )
        await addNewRateToTestContract(stateServer, draftB010)

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]

        expect(subB0.rateRevisions[0].rate!.id).toBe(OneID)

        // unlock B, rate 3 should unlock, rate 1 should not.
        await unlockTestHealthPlanPackage(
            cmsServer,
            contractB0.id,
            'test unlock'
        )

        const unlockedB = await fetchTestContract(stateServer, contractB0.id)
        if (!unlockedB.draftRates) {
            throw new Error('no draft rates')
        }

        expect(unlockedB.draftRates?.length).toBe(2) // this feels like it shouldnt work, probably pulling from the old rev.

        const rate1 = unlockedB.draftRates[0]
        const rate3 = unlockedB.draftRates[1]

        expect(rate1.status).toBe('SUBMITTED')
        expect(rate3.status).toBe('UNLOCKED')

        const rateUpdateInput = updateRatesInputFromDraftContract(unlockedB)
        expect(rateUpdateInput.updatedRates).toHaveLength(2)
        expect(rateUpdateInput.updatedRates[0].type).toBe('LINK')
        expect(rateUpdateInput.updatedRates[1].type).toBe('UPDATE')
        if (!rateUpdateInput.updatedRates[1].formData) {
            throw new Error('should be set')
        }

        rateUpdateInput.updatedRates[1].formData.rateDateCertified = '2000-01-22'

        const updatedB = await updateTestDraftRatesOnContract(stateServer, rateUpdateInput)
        expect(updatedB.draftRates![1].draftRevision?.formData.rateDateCertified).toBe('2000-01-22')

    })

    it('checks parent rates on update', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser()
            }
        })

        console.log('1.')
        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)

        await addNewRateToTestContract(stateServer, draftA010)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rate!.id

        console.log('2.')
        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(stateServer, draftB0, OneID)    
        await addNewRateToTestContract(stateServer, draftB010)

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]

        expect(subB0.rateRevisions[0].rate!.id).toBe(OneID)

        // unlock A
        await unlockTestHealthPlanPackage(cmsServer, contractA0.id, 'unlock a')
        // unlock B, rate 3 should unlock, rate 1 should not. 
        await unlockTestHealthPlanPackage(cmsServer, contractB0.id, 'test unlock')

        const unlockedB = await fetchTestContract(stateServer, contractB0.id)
        if (!unlockedB.draftRates) {
            throw new Error('no draft rates')
        }

        expect(unlockedB.draftRates?.length).toBe(2) // this feels like it shouldnt work, probably pulling from the old rev.

        const rate1 = unlockedB.draftRates[0]
        const rate3 = unlockedB.draftRates[1]

        expect(rate1.status).toBe('UNLOCKED')
        expect(rate3.status).toBe('UNLOCKED')

        const rateUpdateInput = updateRatesInputFromDraftContract(unlockedB)
        expect(rateUpdateInput.updatedRates).toHaveLength(2)
        expect(rateUpdateInput.updatedRates[0].type).toBe('LINK')
        expect(rateUpdateInput.updatedRates[1].type).toBe('UPDATE')
        if (!rateUpdateInput.updatedRates[1].formData) {
            throw new Error('should be set')
        }

        // attempt to update a link
        rateUpdateInput.updatedRates[0].type = 'UPDATE'
        rateUpdateInput.updatedRates[0].formData = rateUpdateInput.updatedRates[1].formData

        rateUpdateInput.updatedRates[1].formData.rateDateCertified = '2000-01-22'

        const updateResult = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: rateUpdateInput,
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (!updateResult.errors) {
            throw new Error('must be defined')
        }

        expect(updateResult.errors[0].message).toMatch(/^Attempted to update a rate that is not a child of this contract/)

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
            'user not authorized to fetch state data'
        )
    })

    it('tests actions from the diagram that Jason made', async () => {
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        // make draft contract 1.1 with rate A.1 and submit
        const S1 = await createAndSubmitTestContractWithRate(stateServer)
        expect(S1.status).toBe('SUBMITTED')

        // unlock S1 so state can add Rate B
        // TODO: validate on package submissions not revs
        const unlockS1Res = await unlockTestHealthPlanPackage(
            cmsServer,
            S1.id,
            'You are missing a rate'
        )
        const S1initSubmit = unlockS1Res.revisions[1].node

        expect(unlockS1Res.status).toBe('UNLOCKED')
        expect(unlockS1Res.revisions).toHaveLength(2)
        // test the ordering
        expect(S1initSubmit.submitInfo?.updatedReason).toBe(
            'Initial submission'
        )

        // add rateB and submit
        const S2draft = await fetchTestContract(stateServer, unlockS1Res.id)
        const S2draftWithRateB = await addNewRateToTestContract(
            stateServer,
            S2draft
        )

        const S2Submitted = await stateServer.executeOperation({
            query: SUBMIT_CONTRACT,
            variables: {
                input: {
                    contractID: S2draftWithRateB.id,
                    submittedReason: 'Added rate B to the submission',
                },
            },
        })
        const S2data = S2Submitted.data?.submitContract.contract as Contract

        expect(S2Submitted.errors).toBeUndefined()
        expect(S2data.status).toBe('RESUBMITTED')
        expect(S2data.packageSubmissions).toHaveLength(2)

        // We now have contract 1.2 with A.1 and B.1

        // unlock rate A and update it
        const rateA = S2data.packageSubmissions[0].rateRevisions[0].rate as Rate
        const unlockRateARes = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: rateA.id,
                    unlockedReason: 'Unlocking Rate A for update',
                },
            },
        })

        const rateAUnlockData = unlockRateARes.data?.unlockRate.rate as Rate
        expect(unlockRateARes.errors).toBeUndefined()
        expect(rateAUnlockData.status).toBe('UNLOCKED')
        expect(rateAUnlockData.draftRevision?.unlockInfo?.updatedReason).toBe(
            'Unlocking Rate A for update'
        )

        // make changes to Rate A and re-submit for Rate A.2
        // TODO: this uses Prisma directly, we want to use updateRate resolver
        // once we have one
        const updateRateA2res = await updateTestRate(rateA.id, {
            rateDateStart: new Date(Date.UTC(2024, 2, 1)),
            rateDateEnd: new Date(Date.UTC(2025, 1, 31)),
            rateDateCertified: new Date(Date.UTC(2024, 1, 31)),
        })
        const S3 = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: updateRateA2res.id,
                },
            },
        })
        expect(S3.errors).toBeUndefined()

        // Unlock contract and update it
        await unlockTestHealthPlanPackage(
            cmsServer,
            S2data.id,
            'Unlocking to update contract to give us rev 3'
        )

        const unlockedS3 = await fetchTestContract(stateServer, S2data.id)

        await updateTestHealthPlanPackage(stateServer, unlockedS3.id, {
            contractDocuments: [
                {
                    name: 'new-doc-to-support',
                    s3URL: 'testS3URL',
                    sha256: 'fakesha12345',
                },
            ],
        })

        await submitTestContract(
            stateServer,
            unlockedS3.id,
            'Added the new document'
        )
        // TODO: Unlock RateB and unlink RateA
        // TODO: Update & Resubmit Rate B.2
    })
})
