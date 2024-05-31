/* eslint-disable  @typescript-eslint/no-non-null-assertion */

import UPDATE_DRAFT_CONTRACT_RATES from 'app-graphql/src/mutations/updateDraftContractRates.graphql'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanFormData,
} from '../../testHelpers/gqlHelpers'
import SUBMIT_CONTRACT from '../../../../app-graphql/src/mutations/submitContract.graphql'

import { testCMSUser } from '../../testHelpers/userHelpers'
import type {
    ContractRevision,
    RateRevision,
    SubmitContractInput,
} from '../../gen/gqlServer'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToRateInput,
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    fetchTestRateById,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

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
        const rateID = sub.rateRevisions[0].rateID
        const rate = await fetchTestRateById(stateServer, rateID)
        expect(rate.status).toBe('SUBMITTED')
    })

    it('handles a submission with a link', async () => {
        const stateServer = await constructTestPostgresServer()

        const contract1 = await createAndSubmitTestContractWithRate(stateServer)
        const rate1ID = contract1.packageSubmissions[0].rateRevisions[0].rateID

        const draft2 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        await addLinkedRateToTestContract(stateServer, draft2, rate1ID)
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
        const OneID = rate10.rateID
        const rate20 = subA0.rateRevisions[1]
        const TwoID = rate20.rateID

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
        const ThreeID = rate30.rateID

        expect(subB0.rateRevisions[0].rateID).toBe(OneID)

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
        const FourID = rate40.rateID
        expect(subC0.rateRevisions[0].rateID).toBe(TwoID)

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

    it('unlocks a submission with a removed child rate', async () => {
        const ldService = testLDService({})

        const stateServer = await constructTestPostgresServer({
            ldService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
        })

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        await addNewRateToTestContract(stateServer, draftA0)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

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

        expect(subB0.rateRevisions[0].rateID).toBe(OneID)

        // 3. unlock and resubmit B, removing Three
        await unlockTestHealthPlanPackage(
            cmsServer,
            contractB0.id,
            'remove that child rate'
        )

        const unlockedB0 = await fetchTestContract(stateServer, contractB0.id)

        const unlockedBUpdateInput =
            updateRatesInputFromDraftContract(unlockedB0)
        unlockedBUpdateInput.updatedRates = [
            unlockedBUpdateInput.updatedRates[0],
        ]

        const updatedUnlockedB0 = await updateTestDraftRatesOnContract(
            stateServer,
            unlockedBUpdateInput
        )

        expect(updatedUnlockedB0.draftRates).toHaveLength(1)

        await submitTestContract(
            stateServer,
            updatedUnlockedB0.id,
            'resubmit without child'
        )

        // 4. Unlock again, should not error
        await unlockTestHealthPlanPackage(
            cmsServer,
            updatedUnlockedB0.id,
            'dont try and reunlock'
        )
        const unlockedB1 = await fetchTestContract(
            stateServer,
            updatedUnlockedB0.id
        )

        expect(unlockedB1.draftRates).toHaveLength(1)
    })

    it('handles cross related rates and contracts', async () => {
        const ldService = testLDService({})
        const prismaClient = await sharedTestPrismaClient()

        const stateServer = await constructTestPostgresServer({
            ldService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
        })

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2001-01-01',
        })

        await addNewRateToTestContract(stateServer, draftA010, {
            rateDateStart: '2002-01-01',
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID
        const rate20 = subA0.rateRevisions[1]
        const TwoID = rate20.rateID

        console.info('ONEID', OneID)
        console.info('TWOID', TwoID)

        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const BID = draftB0.id
        const draftB010 = await addNewRateToTestContract(stateServer, draftB0, {
            rateDateStart: '2003-01-01',
        })
        await addLinkedRateToTestContract(stateServer, draftB010, OneID)

        const contractB0 = await submitTestContract(stateServer, BID)
        const subB0 = contractB0.packageSubmissions[0]
        const rate30 = subB0.rateRevisions[0]
        const ThreeID = rate30.rateID
        console.info('THREEID', ThreeID)

        expect(subB0.rateRevisions[0].rateID).toBe(ThreeID)
        expect(subB0.rateRevisions[1].rateID).toBe(OneID)

        // 3. Submit C0 with Rate20 and Rate30 and Rate40
        const draftC0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const CID = draftC0.id
        const draftC020 = await addLinkedRateToTestContract(
            stateServer,
            draftC0,
            TwoID
        )
        const draftC020two = await addNewRateToTestContract(
            stateServer,
            draftC020,
            {
                rateDateStart: '2004-01-01',
            }
        )

        await addLinkedRateToTestContract(stateServer, draftC020two, ThreeID)

        const contractC0 = await submitTestContract(stateServer, CID)
        const subC0 = contractC0.packageSubmissions[0]
        const rate40 = subC0.rateRevisions[1]
        const FourID = rate40.rateID
        console.info('FOURID', FourID)
        expect(subC0.rateRevisions[0].rateID).toBe(TwoID)
        expect(subC0.rateRevisions[2].rateID).toBe(ThreeID)

        // resubmit A, connecting it to B and C's
        await unlockTestHealthPlanPackage(
            cmsServer,
            AID,
            'unlock to weave the web'
        )
        const unlockedA0 = await fetchTestContract(stateServer, AID)
        const unlockedA0Three = await addLinkedRateToTestContract(
            stateServer,
            unlockedA0,
            ThreeID
        )
        await addLinkedRateToTestContract(stateServer, unlockedA0Three, FourID)

        await submitTestContract(stateServer, AID, 'a tied up')
        const revisionA1 = await prismaClient.contractRevisionTable.findFirst({
            where: {
                contractID: AID,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
        if (!revisionA1 || !revisionA1.submitInfoID) {
            throw new Error('No A1')
        }

        const connections =
            await prismaClient.submissionPackageJoinTable.findMany({
                where: {
                    submissionID: revisionA1.submitInfoID,
                },
            })

        expect(connections).toHaveLength(9)
    })

    it('handles complex submission etc', async () => {
        const ldService = testLDService({})

        const stateServer = await constructTestPostgresServer({
            ldService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
        })

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2001-01-01',
        })

        await addNewRateToTestContract(stateServer, draftA010, {
            rateDateStart: '2002-01-01',
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID
        const rate20 = subA0.rateRevisions[1]
        const TwoID = rate20.rateID

        console.info('ONEID', OneID)
        console.info('TWOID', TwoID)

        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const BID = draftB0.id
        const draftB010 = await addNewRateToTestContract(stateServer, draftB0, {
            rateDateStart: '2003-01-01',
        })
        await addLinkedRateToTestContract(stateServer, draftB010, OneID)

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]
        const rate30 = subB0.rateRevisions[0]
        const ThreeID = rate30.rateID
        console.info('THREEID', ThreeID)

        expect(subB0.rateRevisions[0].rateID).toBe(ThreeID)
        expect(subB0.rateRevisions[1].rateID).toBe(OneID)

        // 3. Submit C0 with Rate20 and Rate40
        const draftC0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const CID = draftC0.id
        const draftC020 = await addLinkedRateToTestContract(
            stateServer,
            draftC0,
            TwoID
        )
        await addNewRateToTestContract(stateServer, draftC020, {
            rateDateStart: '2004-01-01',
        })

        const contractC0 = await submitTestContract(stateServer, draftC0.id)
        const subC0 = contractC0.packageSubmissions[0]
        const rate40 = subC0.rateRevisions[1]
        const FourID = rate40.rateID
        console.info('FOURID', FourID)
        expect(subC0.rateRevisions[0].rateID).toBe(TwoID)

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
        const DID = draftD0.id
        const contractD0 = await submitTestContract(stateServer, draftD0.id)

        console.info(ThreeID, FourID, contractD0)

        // check on initial setup
        const firstA = await fetchTestContract(stateServer, AID)
        const firstB = await fetchTestContract(stateServer, BID)
        const firstC = await fetchTestContract(stateServer, CID)
        const firstD = await fetchTestContract(stateServer, DID)

        expect(firstA.packageSubmissions).toHaveLength(1)
        expect(firstB.packageSubmissions).toHaveLength(1)
        expect(firstC.packageSubmissions).toHaveLength(1)
        expect(firstD.packageSubmissions).toHaveLength(1)

        // 5. resubmit A, 1, and 2. B and C will get new entries.
        console.info('---- UNLOCK A.1 ----')
        const unlockedA0Pkg = await unlockTestHealthPlanPackage(
            cmsServer,
            AID,
            'Unlock A.0'
        )
        const a0FormData = latestFormData(unlockedA0Pkg)
        const unlockedA0Contract = await fetchTestContract(stateServer, AID)
        a0FormData.submissionDescription = 'DESC A1'
        await updateTestHealthPlanFormData(stateServer, a0FormData)
        const a0RatesUpdates =
            updateRatesInputFromDraftContract(unlockedA0Contract)
        expect(a0RatesUpdates.updatedRates[0].rateID).toBe(OneID)
        expect(a0RatesUpdates.updatedRates[1].rateID).toBe(TwoID)

        if (
            !a0RatesUpdates.updatedRates[0].formData ||
            !a0RatesUpdates.updatedRates[1].formData
        ) {
            throw new Error('missing updates')
        }

        expect(a0RatesUpdates.updatedRates[0].formData.rateDateStart).toBe(
            '2001-01-01'
        )
        expect(a0RatesUpdates.updatedRates[1].formData.rateDateStart).toBe(
            '2002-01-01'
        )

        a0RatesUpdates.updatedRates[0].formData.rateDateStart = '2001-02-02'
        a0RatesUpdates.updatedRates[1].formData.rateDateStart = '2002-02-02'
        await updateTestDraftRatesOnContract(stateServer, a0RatesUpdates)

        console.info('---- SUBMIT A.1 ----')
        await submitTestContract(stateServer, AID, 'Submit A.1')

        // Check second showing
        const secondA = await fetchTestContract(stateServer, AID)
        const secondB = await fetchTestContract(stateServer, BID)
        const secondC = await fetchTestContract(stateServer, CID)
        const secondD = await fetchTestContract(stateServer, DID)

        expect(secondA.packageSubmissions).toHaveLength(2)
        expect(secondB.packageSubmissions).toHaveLength(2)
        expect(secondC.packageSubmissions).toHaveLength(2)
        expect(secondD.packageSubmissions).toHaveLength(1)

        expect(secondA.packageSubmissions[0].submitInfo.updatedReason).toBe(
            'Submit A.1'
        )
        expect(
            secondA.packageSubmissions[0].contractRevision.formData
                .submissionDescription
        ).toBe('DESC A1')
        expect(secondA.packageSubmissions[1].submitInfo.updatedReason).toBe(
            'Initial submission'
        )
        expect(
            secondA.packageSubmissions[1].contractRevision.formData
                .submissionDescription
        ).toBe('An updated submission')

        // check B history
        expect(secondB.packageSubmissions[1].submitInfo.updatedReason).toBe(
            'Initial submission'
        )
        expect(
            secondB.packageSubmissions[1].contractRevision.formData
                .submissionDescription
        ).toBe('An updated submission')
        expect(secondB.packageSubmissions[1].rateRevisions).toHaveLength(2)
        expect(
            secondB.packageSubmissions[1].rateRevisions[0].formData
                .rateDateStart
        ).toBe('2003-01-01')
        expect(
            secondB.packageSubmissions[1].rateRevisions[1].formData
                .rateDateStart
        ).toBe('2001-01-01')

        expect(secondB.packageSubmissions[0].submitInfo.updatedReason).toBe(
            'Submit A.1'
        )
        expect(
            secondB.packageSubmissions[0].contractRevision.formData
                .submissionDescription
        ).toBe('An updated submission')
        expect(secondB.packageSubmissions[0].rateRevisions).toHaveLength(2)
        expect(
            secondB.packageSubmissions[0].rateRevisions[0].formData
                .rateDateStart
        ).toBe('2003-01-01')
        expect(
            secondB.packageSubmissions[0].rateRevisions[1].formData
                .rateDateStart
        ).toBe('2001-02-02')

        // 6. resubmit B, add r4. Only B gets a new entry.
        console.info('---- UNLOCK B.1 ----')
        const unlockedB0Pkg = await unlockTestHealthPlanPackage(
            cmsServer,
            BID,
            'Unlock B.0'
        )
        const b0FormData = latestFormData(unlockedB0Pkg)
        const unlockedB0Contract = await fetchTestContract(stateServer, BID)

        b0FormData.submissionDescription = 'DESC B1'
        await updateTestHealthPlanFormData(stateServer, b0FormData)
        const b0RatesUpdates =
            updateRatesInputFromDraftContract(unlockedB0Contract)
        expect(b0RatesUpdates.updatedRates[0].type).toBe('UPDATE')
        expect(b0RatesUpdates.updatedRates[0].rateID).toBe(ThreeID)
        expect(b0RatesUpdates.updatedRates[1].type).toBe('LINK')
        expect(b0RatesUpdates.updatedRates[1].rateID).toBe(OneID)

        if (!b0RatesUpdates.updatedRates[0].formData) {
            throw new Error('missing updates')
        }

        expect(b0RatesUpdates.updatedRates[0].formData.rateDateStart).toBe(
            '2003-01-01'
        )

        b0RatesUpdates.updatedRates[0].formData.rateDateStart = '2003-02-02'

        const b0RatesUpdatesWith4 = addLinkedRateToRateInput(
            b0RatesUpdates,
            FourID
        )

        await updateTestDraftRatesOnContract(stateServer, b0RatesUpdatesWith4)

        console.info('---- SUBMIT B.1 ----')
        await submitTestContract(stateServer, BID, 'Submit B.1')

        // Check third showing
        const thirdA = await fetchTestContract(stateServer, AID)
        const thirdB = await fetchTestContract(stateServer, BID)
        const thirdC = await fetchTestContract(stateServer, CID)
        const thirdD = await fetchTestContract(stateServer, DID)

        expect(thirdA.packageSubmissions).toHaveLength(2)
        expect(thirdB.packageSubmissions).toHaveLength(3)
        expect(thirdC.packageSubmissions).toHaveLength(2)
        expect(thirdD.packageSubmissions).toHaveLength(1)

        // 7. Resubmit C, remove rate 2. B should also get an update.
        const unlockedC0Pkg = await unlockTestHealthPlanPackage(
            cmsServer,
            CID,
            'Unlock C.0'
        )
        const c0FormData = latestFormData(unlockedC0Pkg)
        const unlockedC0Contract = await fetchTestContract(stateServer, CID)

        c0FormData.submissionDescription = 'DESC C1'
        await updateTestHealthPlanFormData(stateServer, c0FormData)
        const c0RatesUpdates =
            updateRatesInputFromDraftContract(unlockedC0Contract)
        expect(c0RatesUpdates.updatedRates[0].type).toBe('LINK')
        expect(c0RatesUpdates.updatedRates[0].rateID).toBe(TwoID)
        expect(c0RatesUpdates.updatedRates[1].type).toBe('UPDATE')
        expect(c0RatesUpdates.updatedRates[1].rateID).toBe(FourID)

        if (!c0RatesUpdates.updatedRates[1].formData) {
            throw new Error('missing updates')
        }

        expect(c0RatesUpdates.updatedRates[1].formData.rateDateStart).toBe(
            '2004-01-01'
        )
        c0RatesUpdates.updatedRates[1].formData.rateDateStart = '2004-02-02'

        // remove linked 2.1
        c0RatesUpdates.updatedRates.splice(0, 1)

        await updateTestDraftRatesOnContract(stateServer, c0RatesUpdates)

        console.info('---- SUBMIT C.1 ----')
        await submitTestContract(stateServer, CID, 'Submit C.1')

        // Check fourth showing
        const fourthA = await fetchTestContract(stateServer, AID)
        const fourthB = await fetchTestContract(stateServer, BID)
        const fourthC = await fetchTestContract(stateServer, CID)
        const fourthD = await fetchTestContract(stateServer, DID)

        expect(fourthA.packageSubmissions).toHaveLength(2)
        expect(fourthB.packageSubmissions).toHaveLength(4)
        expect(fourthC.packageSubmissions).toHaveLength(3)
        expect(fourthD.packageSubmissions).toHaveLength(1)

        // check removal happened:
        const lastCPackage = fourthC.packageSubmissions[0]
        expect(lastCPackage.rateRevisions).toHaveLength(1)
        expect(lastCPackage.rateRevisions[0].formData.rateDateStart).toBe(
            '2004-02-02'
        )

        // Now check that all the histories are as expected
        // Contract A.
        const as1 = fourthA.packageSubmissions[0]
        expect(as1.cause).toBe('CONTRACT_SUBMISSION')
        expect(as1.submittedRevisions).toHaveLength(3)
        expect(as1.submittedRevisions.map((r) => r.id).sort()).toEqual(
            [as1.contractRevision.id]
                .concat(as1.rateRevisions.map((r) => r.id))
                .sort()
        )
        expect(as1.contractRevision.formData.submissionDescription).toBe(
            'DESC A1'
        )
        expect(as1.rateRevisions[0].formData.rateDateStart).toBe('2001-02-02')
        expect(as1.rateRevisions[1].formData.rateDateStart).toBe('2002-02-02')

        const as2 = fourthA.packageSubmissions[1]
        expect(as2.cause).toBe('CONTRACT_SUBMISSION')
        expect(as2.submittedRevisions).toHaveLength(3)
        expect(as2.submittedRevisions.map((r) => r.id).sort()).toEqual(
            [as2.contractRevision.id]
                .concat(as2.rateRevisions.map((r) => r.id))
                .sort()
        )
        expect(as2.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(as2.rateRevisions[0].formData.rateDateStart).toBe('2001-01-01')
        expect(as2.rateRevisions[1].formData.rateDateStart).toBe('2002-01-01')

        // Contract B
        const bs1 = fourthB.packageSubmissions[0]
        expect(bs1.submittedRevisions).toHaveLength(2)
        const bs1submittedContract = bs1
            .submittedRevisions[0] as ContractRevision
        const bs1submittedRate = bs1.submittedRevisions[1] as RateRevision
        expect(bs1submittedContract.formData.submissionDescription).toBe(
            'DESC C1'
        )
        expect(bs1submittedRate.formData.rateDateStart).toBe('2004-02-02')
        expect(bs1.contractRevision.formData.submissionDescription).toBe(
            'DESC B1'
        )
        expect(bs1.rateRevisions[0].formData.rateDateStart).toBe('2003-02-02')
        expect(bs1.rateRevisions[1].formData.rateDateStart).toBe('2001-02-02')
        expect(bs1.rateRevisions[2].formData.rateDateStart).toBe('2004-02-02')
        expect(bs1.cause).toBe('RATE_SUBMISSION')

        const bs2 = fourthB.packageSubmissions[1]
        expect(bs2.submittedRevisions).toHaveLength(2)
        const bs2submittedContract = bs2
            .submittedRevisions[0] as ContractRevision
        const bs2submittedRate = bs2.submittedRevisions[1] as RateRevision
        expect(bs2submittedContract.formData.submissionDescription).toBe(
            'DESC B1'
        )
        expect(bs2submittedRate.formData.rateDateStart).toBe('2003-02-02')
        expect(bs2.contractRevision.formData.submissionDescription).toBe(
            'DESC B1'
        )
        expect(bs2.rateRevisions[0].formData.rateDateStart).toBe('2003-02-02')
        expect(bs2.rateRevisions[1].formData.rateDateStart).toBe('2001-02-02')
        expect(bs2.rateRevisions[2].formData.rateDateStart).toBe('2004-01-01')
        expect(bs2.cause).toBe('CONTRACT_SUBMISSION')

        const bs3 = fourthB.packageSubmissions[2]
        expect(bs3.submittedRevisions).toHaveLength(3)
        const bs3submittedContract = bs3
            .submittedRevisions[0] as ContractRevision
        const bs3submittedRate = bs3.submittedRevisions[1] as RateRevision
        const bs3submittedRate2 = bs3.submittedRevisions[2] as RateRevision
        expect(bs3submittedContract.formData.submissionDescription).toBe(
            'DESC A1'
        )
        expect(
            [bs3submittedRate, bs3submittedRate2]
                .map((rr) => rr.formData.rateDateStart)
                .sort()
        ).toEqual(['2001-02-02', '2002-02-02'])
        expect(bs3.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(bs3.rateRevisions[0].formData.rateDateStart).toBe('2003-01-01')
        expect(bs3.rateRevisions[1].formData.rateDateStart).toBe('2001-02-02')
        expect(bs3.cause).toBe('RATE_SUBMISSION')

        const bs4 = fourthB.packageSubmissions[3]
        expect(bs4.submittedRevisions).toHaveLength(2)
        const bs4submittedContract = bs4
            .submittedRevisions[0] as ContractRevision
        const bs4submittedRate = bs4.submittedRevisions[1] as RateRevision
        expect(bs4submittedContract.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(bs4submittedRate.formData.rateDateStart).toBe('2003-01-01')
        expect(bs4.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(bs4.rateRevisions[0].formData.rateDateStart).toBe('2003-01-01')
        expect(bs4.rateRevisions[1].formData.rateDateStart).toBe('2001-01-01')
        expect(bs4.cause).toBe('CONTRACT_SUBMISSION')

        // C
        const cs1 = fourthC.packageSubmissions[0]
        expect(cs1.submittedRevisions).toHaveLength(2)
        const cs1submittedContract = cs1
            .submittedRevisions[0] as ContractRevision
        const cs1submittedRate = cs1.submittedRevisions[1] as RateRevision
        expect(cs1submittedContract.formData.submissionDescription).toBe(
            'DESC C1'
        )
        expect(cs1submittedRate.formData.rateDateStart).toBe('2004-02-02')
        expect(cs1.contractRevision.formData.submissionDescription).toBe(
            'DESC C1'
        )
        expect(cs1.rateRevisions[0].formData.rateDateStart).toBe('2004-02-02')
        expect(cs1.rateRevisions).toHaveLength(1)
        expect(cs1.cause).toBe('CONTRACT_SUBMISSION')

        const cs2 = fourthC.packageSubmissions[1]
        expect(cs2.submittedRevisions).toHaveLength(3)
        const cs2submittedContract = cs2
            .submittedRevisions[0] as ContractRevision
        const cs2submittedRate = cs2.submittedRevisions[1] as RateRevision
        const cs2submittedRate2 = cs2.submittedRevisions[2] as RateRevision
        expect(cs2submittedContract.formData.submissionDescription).toBe(
            'DESC A1'
        )
        expect(
            [cs2submittedRate, cs2submittedRate2]
                .map((rr) => rr.formData.rateDateStart)
                .sort()
        ).toEqual(['2001-02-02', '2002-02-02'])
        expect(cs2.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(cs2.rateRevisions[0].formData.rateDateStart).toBe('2002-02-02')
        expect(cs2.rateRevisions[1].formData.rateDateStart).toBe('2004-01-01')
        expect(cs2.rateRevisions).toHaveLength(2)
        expect(cs2.cause).toBe('RATE_SUBMISSION')

        const cs3 = fourthC.packageSubmissions[2]
        expect(cs3.submittedRevisions).toHaveLength(2)
        const cs3submittedContract = cs3
            .submittedRevisions[0] as ContractRevision
        const cs3submittedRate = cs3.submittedRevisions[1] as RateRevision
        expect(cs3submittedContract.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(cs3submittedRate.formData.rateDateStart).toBe('2004-01-01')
        expect(cs3.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(cs3.rateRevisions[0].formData.rateDateStart).toBe('2002-01-01')
        expect(cs3.rateRevisions[1].formData.rateDateStart).toBe('2004-01-01')
        expect(cs3.rateRevisions).toHaveLength(2)
        expect(cs3.cause).toBe('CONTRACT_SUBMISSION')

        // D
        const ds1 = fourthD.packageSubmissions[0]
        expect(ds1.submittedRevisions).toHaveLength(1)
        const ds1submittedContract = ds1
            .submittedRevisions[0] as ContractRevision
        expect(ds1submittedContract.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(ds1.contractRevision.formData.submissionDescription).toBe(
            'An updated submission'
        )
        expect(ds1.rateRevisions).toHaveLength(0)
        expect(ds1.cause).toBe('CONTRACT_SUBMISSION')
    }, 10000)

    it('returns the correct dateAdded for documents', async () => {
        const ldService = testLDService({})
        const prismaClient = await sharedTestPrismaClient()
        const stateServer = await constructTestPostgresServer({
            ldService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
        })

        const dummyDoc = (postfix: string) => {
            return {
                name: `doc${postfix}.pdf`,
                s3URL: `fakeS3URL${postfix}`,
                sha256: `fakesha${postfix}`,
            }
        }

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 = await createAndUpdateTestContractWithoutRates(
            stateServer,
            'FL',
            {
                contractDocuments: [dummyDoc('c1')],
                documents: [dummyDoc('s1')],
            }
        )
        const AID = draftA0.id
        await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2001-01-01',
            rateDocuments: [dummyDoc('r1')],
            supportingDocuments: [dummyDoc('x1')],
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        // CHANGE SUBMISSION DATE
        await prismaClient.contractRevisionTable.update({
            where: {
                id: subA0.contractRevision.id,
            },
            data: {
                submitInfo: {
                    update: {
                        updatedAt: new Date('2024-01-01'),
                    },
                },
            },
        })

        const fixSubmitA0 = await fetchTestContract(stateServer, AID)

        const contractRev = fixSubmitA0.packageSubmissions[0].contractRevision

        expect(contractRev.formData.contractDocuments).toHaveLength(1)
        expect(contractRev.formData.contractDocuments[0].name).toBe('docc1.pdf')
        expect(contractRev.formData.contractDocuments[0].dateAdded).toBe(
            '2024-01-01'
        )

        expect(contractRev.formData.supportingDocuments).toHaveLength(1)
        expect(contractRev.formData.supportingDocuments[0].name).toBe(
            'docs1.pdf'
        )
        expect(contractRev.formData.supportingDocuments[0].dateAdded).toBe(
            '2024-01-01'
        )

        const rateRev = fixSubmitA0.packageSubmissions[0].rateRevisions[0]

        expect(rateRev.formData.rateDocuments).toHaveLength(1)
        expect(rateRev.formData.rateDocuments[0].name).toBe('docr1.pdf')
        expect(rateRev.formData.rateDocuments[0].dateAdded).toBe('2024-01-01')

        expect(rateRev.formData.supportingDocuments).toHaveLength(1)
        expect(rateRev.formData.supportingDocuments[0].name).toBe('docx1.pdf')
        expect(rateRev.formData.supportingDocuments[0].dateAdded).toBe(
            '2024-01-01'
        )

        // 2. Unlock and add more documents
        const unlockedA0Pkg = await unlockTestHealthPlanPackage(
            cmsServer,
            AID,
            'Unlock A.0'
        )
        const a0FormData = latestFormData(unlockedA0Pkg)
        const unlockedA0Contract = await fetchTestContract(stateServer, AID)
        a0FormData.submissionDescription = 'DESC A1'
        a0FormData.contractDocuments.push(dummyDoc('c2'))
        a0FormData.documents.push(dummyDoc('s2'))

        await updateTestHealthPlanFormData(stateServer, a0FormData)
        const a0RatesUpdates =
            updateRatesInputFromDraftContract(unlockedA0Contract)
        expect(a0RatesUpdates.updatedRates[0].rateID).toBe(OneID)
        a0RatesUpdates.updatedRates[0].formData?.rateDocuments.push(
            dummyDoc('r2')
        )
        a0RatesUpdates.updatedRates[0].formData?.supportingDocuments.push(
            dummyDoc('x2')
        )

        await updateTestDraftRatesOnContract(stateServer, a0RatesUpdates)

        const submittedA1 = await submitTestContract(
            stateServer,
            AID,
            'Submit A.1'
        )
        const a1sub = submittedA1.packageSubmissions[0]

        // CHANGE SUBMISSION DATE
        await prismaClient.contractRevisionTable.update({
            where: {
                id: a1sub.contractRevision.id,
            },
            data: {
                submitInfo: {
                    update: {
                        updatedAt: new Date('2024-02-02'),
                    },
                },
            },
        })

        const fixedContractA1 = await fetchTestContract(stateServer, AID)

        const contractRevA1 =
            fixedContractA1.packageSubmissions[0].contractRevision

        expect(contractRevA1.formData.contractDocuments).toHaveLength(2)
        expect(contractRevA1.formData.contractDocuments[0].name).toBe(
            'docc1.pdf'
        )
        expect(contractRevA1.formData.contractDocuments[0].dateAdded).toBe(
            '2024-01-01'
        )

        expect(contractRevA1.formData.contractDocuments[1].name).toBe(
            'docc2.pdf'
        )
        expect(contractRevA1.formData.contractDocuments[1].dateAdded).toBe(
            '2024-02-02'
        )

        expect(contractRevA1.formData.supportingDocuments).toHaveLength(2)
        expect(contractRevA1.formData.supportingDocuments[0].name).toBe(
            'docs1.pdf'
        )
        expect(contractRevA1.formData.supportingDocuments[0].dateAdded).toBe(
            '2024-01-01'
        )

        expect(contractRevA1.formData.supportingDocuments[1].name).toBe(
            'docs2.pdf'
        )
        expect(contractRevA1.formData.supportingDocuments[1].dateAdded).toBe(
            '2024-02-02'
        )

        const rateRevA1 = fixedContractA1.packageSubmissions[0].rateRevisions[0]

        expect(rateRevA1.formData.rateDocuments).toHaveLength(2)
        expect(rateRevA1.formData.rateDocuments[0].name).toBe('docr1.pdf')
        expect(rateRevA1.formData.rateDocuments[0].dateAdded).toBe('2024-01-01')

        expect(rateRevA1.formData.rateDocuments[1].name).toBe('docr2.pdf')
        expect(rateRevA1.formData.rateDocuments[1].dateAdded).toBe('2024-02-02')

        expect(rateRevA1.formData.supportingDocuments).toHaveLength(2)
        expect(rateRevA1.formData.supportingDocuments[0].name).toBe('docx1.pdf')
        expect(rateRevA1.formData.supportingDocuments[0].dateAdded).toBe(
            '2024-01-01'
        )

        expect(rateRevA1.formData.supportingDocuments[1].name).toBe('docx2.pdf')
        expect(rateRevA1.formData.supportingDocuments[1].dateAdded).toBe(
            '2024-02-02'
        )
    })

    it('handles unlock and editing rates', async () => {
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const stateServer = await constructTestPostgresServer({
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        console.info('1.')
        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)

        await addNewRateToTestContract(stateServer, draftA010)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        console.info('2.')
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

        expect(subB0.rateRevisions[0].rateID).toBe(OneID)

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

        rateUpdateInput.updatedRates[1].formData.rateDateCertified =
            '2000-01-22'

        const updatedB = await updateTestDraftRatesOnContract(
            stateServer,
            rateUpdateInput
        )
        expect(
            updatedB.draftRates![1].draftRevision?.formData.rateDateCertified
        ).toBe('2000-01-22')
    })

    it('checks parent rates on update', async () => {
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const stateServer = await constructTestPostgresServer({
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        console.info('1.')
        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2021-01-01',
        })

        await addNewRateToTestContract(stateServer, draftA010, {
            rateDateStart: '2022-02-02',
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        console.info('2.')
        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(
            stateServer,
            draftB0,
            OneID
        )
        await addNewRateToTestContract(stateServer, draftB010, {
            rateDateStart: '2023-03-03',
        })

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]

        expect(subB0.rateRevisions[0].rateID).toBe(OneID)

        // rate1 then rate3
        expect(
            subB0.rateRevisions.map((r) => r.formData.rateDateStart)
        ).toEqual(['2021-01-01', '2023-03-03'])

        // unlock A
        await unlockTestHealthPlanPackage(cmsServer, contractA0.id, 'unlock a')
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

        expect(unlockedB.draftRates?.length).toBe(2)
        expect(
            unlockedB.draftRates.map(
                (r) => r.draftRevision!.formData.rateDateStart
            )
        ).toEqual(['2021-01-01', '2023-03-03'])

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
        rateUpdateInput.updatedRates[0].formData =
            rateUpdateInput.updatedRates[1].formData

        rateUpdateInput.updatedRates[1].formData.rateDateCertified =
            '2000-01-22'

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

        expect(updateResult.errors[0].message).toMatch(
            /^Attempted to update a rate that is not a child of this contract/
        )
    })

    it('can remove a child unlocked rate', async () => {
        //TODO: make a child rate, submit and unlock, then remove it.
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const stateServer = await constructTestPostgresServer({
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        console.info('1.')
        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2021-01-01',
        })

        await addNewRateToTestContract(stateServer, draftA010, {
            rateDateStart: '2022-02-02',
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        console.info('2.')
        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(
            stateServer,
            draftB0,
            OneID
        )
        await addNewRateToTestContract(stateServer, draftB010, {
            rateDateStart: '2023-03-03',
        })

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]

        expect(subB0.rateRevisions[0].rateID).toBe(OneID)

        // rate1 then rate3
        expect(
            subB0.rateRevisions.map((r) => r.formData.rateDateStart)
        ).toEqual(['2021-01-01', '2023-03-03'])

        // unlock A
        await unlockTestHealthPlanPackage(cmsServer, contractA0.id, 'unlock a')
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

        expect(unlockedB.draftRates?.length).toBe(2)
        expect(
            unlockedB.draftRates.map(
                (r) => r.draftRevision!.formData.rateDateStart
            )
        ).toEqual(['2021-01-01', '2023-03-03'])

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
        rateUpdateInput.updatedRates[0].formData =
            rateUpdateInput.updatedRates[1].formData

        rateUpdateInput.updatedRates[1].formData.rateDateCertified =
            '2000-01-22'

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

        expect(updateResult.errors[0].message).toMatch(
            /^Attempted to update a rate that is not a child of this contract/
        )
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
        const stateServer = await constructTestPostgresServer({
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
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
        const S1Unlocked = await fetchTestContract(stateServer, unlockS1Res.id)
        expect(S1Unlocked.status).toBe('UNLOCKED')
        expect(S1Unlocked.draftRevision?.unlockInfo?.updatedReason).toBe(
            'You are missing a rate'
        )

        // add rateB and submit
        const S2draft = await fetchTestContract(stateServer, unlockS1Res.id)
        const S2draftWithRateB = await addNewRateToTestContract(
            stateServer,
            S2draft
        )

        const S2 = await submitTestContract(
            stateServer,
            S2draftWithRateB.id,
            'Added rate B to the submission'
        )

        expect(S2.status).toBe('RESUBMITTED')
        expect(S2.packageSubmissions).toHaveLength(2)
        expect(
            S2.packageSubmissions[0].contractRevision.submitInfo?.updatedReason
        ).toBe('Added rate B to the submission')

        // We now have contract 1.2 with A.1 and B.1

        // TODO: Finish this test once we have support for unlocking rates.

        // // unlock rate A and update it
        // const rateAID = S2.packageSubmissions[0].rateRevisions[0].rateID
        // console.info(`unlocking rate ${rateAID}`)
        // const unlockRateARes = await cmsServer.executeOperation({
        //     query: UNLOCK_RATE,
        //     variables: {
        //         input: {
        //             rateID: rateAID,
        //             unlockedReason: 'Unlocking Rate A for update',
        //         },
        //     },
        // })

        // const rateAUnlockData = unlockRateARes.data?.unlockRate.rate as Rate
        // expect(unlockRateARes.errors).toBeUndefined()
        // expect(rateAUnlockData.status).toBe('UNLOCKED')
        // expect(rateAUnlockData.draftRevision?.unlockInfo?.updatedReason).toBe(
        //     'Unlocking Rate A for update'
        // )

        // // make changes to Rate A and re-submit for Rate A.2
        // // TODO: this uses Prisma directly, we want to use updateRate resolver
        // // once we have one
        // const updateRateA2res = await updateTestRate(rateAID, {
        //     rateDateStart: new Date(Date.UTC(2024, 2, 1)),
        //     rateDateEnd: new Date(Date.UTC(2025, 1, 31)),
        //     rateDateCertified: new Date(Date.UTC(2024, 1, 31)),
        // })
        // const S3Res = await stateServer.executeOperation({
        //     query: SUBMIT_RATE,
        //     variables: {
        //         input: {
        //             rateID: updateRateA2res.id,
        //         },
        //     },
        // })
        // expect(S3Res.errors).toBeUndefined()

        // const S3 = await fetchTestContract(stateServer, S2.id)
        // expect(S3.packageSubmissions).toHaveLength(2) // we have contract revision 2

        // // Unlock contract and update it
        // await unlockTestHealthPlanPackage(
        //     cmsServer,
        //     S2.id,
        //     'Unlocking to update contract to give us rev 3'
        // )

        // const unlockedS3 = await fetchTestContract(stateServer, S3.id)
        // expect(unlockedS3.status).toBe('UNLOCKED')

        // await updateTestHealthPlanPackage(stateServer, unlockedS3.id, {
        //     contractDocuments: [
        //         {
        //             name: 'new-doc-to-support',
        //             s3URL: 'testS3URL',
        //             sha256: 'fakesha12345',
        //         },
        //     ],
        // })

        // const S4 = await submitTestContract(
        //     stateServer,
        //     unlockedS3.id,
        //     'Added the new document'
        // )

        // expect(S4.packageSubmissions).toHaveLength(3) // we have contract revision 3

        // // TODO: Unlock RateB and unlink RateA
        // // TODO: Update & Resubmit Rate B.2
    })
})
