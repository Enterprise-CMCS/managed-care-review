import {
    constructTestPostgresServer,
    defaultFloridaProgram,
    updateTestStateAssignments,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { SubmitContractDocument } from '../../gen/gqlClient'
import {
    clearMetadataFromContractFormData,
    createAndUpdateTestEQROContract,
    testS3Client,
} from '../../testHelpers'

import {
    createDBUsersWithFullData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import type { ContractRevision, RateRevision } from '../../gen/gqlServer'
import {
    createAndSubmitTestContract,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    createSubmitAndUnlockTestContract,
    createTestContract,
    fetchTestContract,
    resubmitTestContract,
    submitTestContract,
    unlockTestContract,
    updateTestContractDraftRevision,
} from '../../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToRateInput,
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    testEmailConfig,
    testEmailer,
    testEmailerFromDatabase,
} from '../../testHelpers/emailerHelpers'
import { NewPostgresStore } from '../../postgres'
import { dayjs } from '@mc-review/dates'

describe('submitContract', () => {
    const mockS3 = testS3Client()

    describe('Health plan contract tests', () => {
        it('submits a contract and rates and preserves expected data', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            const draft =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const updatedDraft = await addNewRateToTestContract(
                stateServer,
                draft
            )

            const draftRates = updatedDraft.draftRates

            expect(draftRates).toHaveLength(1)

            const contract = await submitTestContract(stateServer, draft.id)
            // check contract metadata
            const today = new Date()
            // const expectedDate = today.toISOString().split('T')[0]
            expect(contract.draftRevision).toBeNull()
            expect(contract.initiallySubmittedAt).toBeDefined()
            expect(
                Math.abs(
                    contract.initiallySubmittedAt.getTime() - today.getTime()
                )
            ).toBeLessThan(1000)
            expect(contract.packageSubmissions).toHaveLength(1)
            expect(contract.status).toBe('SUBMITTED')
            expect(contract.contractSubmissionType).toBe('HEALTH_PLAN')

            // check page submission metadata
            const sub = contract.packageSubmissions[0]
            expect(sub.cause).toBe('CONTRACT_SUBMISSION')
            expect(sub.submitInfo.updatedReason).toBe('Initial submission')
            expect(sub.submittedRevisions).toHaveLength(2)

            // check form data is unchanged
            const draftFormData = updatedDraft.draftRevision!.formData
            const submittedFormData = sub.contractRevision.formData

            // after submit, the documents have a "date added" that doesn't exist pre-submit
            expect(
                submittedFormData.contractDocuments[0].dateAdded
            ).toBeTruthy()
            submittedFormData.contractDocuments[0].dateAdded = null

            expect(submittedFormData).toEqual({
                ...draftFormData,
                contractDocuments: expect.arrayContaining(
                    draftFormData.contractDocuments.map((doc) =>
                        expect.objectContaining({
                            ...doc,
                            id: expect.any(String),
                        })
                    )
                ),
                supportingDocuments: expect.arrayContaining(
                    draftFormData.supportingDocuments.map((doc) =>
                        expect.objectContaining({
                            ...doc,
                            id: expect.any(String),
                        })
                    )
                ),
            })
        })

        it('submits a contract and removes existing rates on the contract', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: testCMSUser(),
                },
                s3Client: mockS3,
            })

            const draft =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const updatedDraft = await addNewRateToTestContract(
                stateServer,
                draft
            )
            const contractID = draft.id

            const draftRates = updatedDraft.draftRates

            expect(draftRates).toHaveLength(1)

            const contractWithRate = await submitTestContract(
                stateServer,
                contractID
            )

            // expect rates in latest submission
            let latestSubmission = contractWithRate.packageSubmissions[0]
            expect(latestSubmission.rateRevisions).toHaveLength(1)

            await unlockTestContract(
                cmsServer,
                contractID,
                'Change to contract only'
            )

            await updateTestContractDraftRevision(stateServer, contractID)

            const contractWithoutRates = await submitTestContract(
                stateServer,
                contractID,
                'resubmit as contract only'
            )

            // reassigned to the latest submission of contract without rates
            latestSubmission = contractWithoutRates.packageSubmissions[0]

            // expect no rates in latest submission
            expect(latestSubmission.rateRevisions).toHaveLength(0)
        })

        it('handles a submission with a linked rate', async () => {
            const stateServer = await constructTestPostgresServer()

            const contract1 =
                await createAndSubmitTestContractWithRate(stateServer)
            const rate1ID =
                contract1.packageSubmissions[0].rateRevisions[0].rateID

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

        it('can submit a contract with a rate linked to a still unsubmitted contract (MCR-4245 bug)', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })
            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: testCMSUser(),
                },
                s3Client: mockS3,
            })

            // 1. Submit A0 draft with Rate1
            const draftA0 =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const AID = draftA0.id
            await addNewRateToTestContract(stateServer, draftA0)

            const contractA0 = await submitTestContract(stateServer, AID)
            const subA0 = contractA0.packageSubmissions[0]
            const rate10 = subA0.rateRevisions[0]
            const OneID = rate10.rateID

            // 2. Create a new B0 draft, link with Rate1
            const draftB0 =
                await createAndUpdateTestContractWithoutRates(stateServer)
            await addLinkedRateToTestContract(stateServer, draftB0, OneID)

            // 3. Unlock A0, edit and resubmit
            await unlockTestContract(
                cmsServer,
                AID,
                'edit the linked rate, please'
            )

            const resubmittedA = await submitTestContract(
                stateServer,
                AID,
                'and now it resubmits'
            )

            expect(resubmittedA.status).toBe('RESUBMITTED')
        })

        it('preserves connections between cross related rates and contracts', async () => {
            const ldService = testLDService({})
            const prismaClient = await sharedTestPrismaClient()
            const stateServer = await constructTestPostgresServer({
                ldService,
                s3Client: mockS3,
            })
            const cmsServer = await constructTestPostgresServer({
                ldService,
                context: {
                    user: testCMSUser(),
                },
                s3Client: mockS3,
            })

            // 1. Submit A0 with Rate1 and Rate2
            const draftA0 =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const AID = draftA0.id
            const draftA010 = await addNewRateToTestContract(
                stateServer,
                draftA0,
                {
                    rateDateStart: '2001-01-01',
                }
            )

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
            const draftB010 = await addNewRateToTestContract(
                stateServer,
                draftB0,
                {
                    rateDateStart: '2003-01-01',
                }
            )
            await addLinkedRateToTestContract(stateServer, draftB010, OneID)

            const contractB0 = await submitTestContract(stateServer, BID)
            const subB0 = contractB0.packageSubmissions[0]
            const rate30 = subB0.rateRevisions[0]
            const ThreeID = rate30.rateID
            console.info('THREEID', ThreeID)

            expect(subB0.rateRevisions[0].rateID).toBe(ThreeID)
            expect(subB0.rateRevisions[1].rateID).toBe(OneID)

            // 3. Submit C0 with Rate2 and Rate3 and Rate4
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

            await addLinkedRateToTestContract(
                stateServer,
                draftC020two,
                ThreeID
            )

            const contractC0 = await submitTestContract(stateServer, CID)
            const subC0 = contractC0.packageSubmissions[0]
            const rate40 = subC0.rateRevisions[1]
            const FourID = rate40.rateID
            console.info('FOURID', FourID)
            expect(subC0.rateRevisions[0].rateID).toBe(TwoID)
            expect(subC0.rateRevisions[2].rateID).toBe(ThreeID)

            // resubmit A, connecting it to B and C's
            await unlockTestContract(cmsServer, AID, 'unlock to weave the web')
            const unlockedA0 = await fetchTestContract(stateServer, AID)
            const unlockedA0Three = await addLinkedRateToTestContract(
                stateServer,
                unlockedA0,
                ThreeID
            )
            await addLinkedRateToTestContract(
                stateServer,
                unlockedA0Three,
                FourID
            )

            await submitTestContract(stateServer, AID, 'a tied up')
            const revisionA1 =
                await prismaClient.contractRevisionTable.findFirst({
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

        it('handles a complex submission', async () => {
            // this test runs through a scenario from our programming diagrams, maybe best understood next to the visuals
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: testCMSUser(),
                },
                s3Client: mockS3,
            })

            // 1. Submit A0 with Rate1 and Rate2
            const draftA0 =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const AID = draftA0.id
            const draftA010 = await addNewRateToTestContract(
                stateServer,
                draftA0,
                {
                    rateDateStart: '2001-01-01',
                }
            )

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
            const draftB010 = await addNewRateToTestContract(
                stateServer,
                draftB0,
                {
                    rateDateStart: '2003-01-01',
                }
            )
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
            const draftD0 = await createAndUpdateTestContractWithoutRates(
                stateServer,
                undefined,
                {
                    submissionType: 'CONTRACT_ONLY',
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
            const unlockedA0 = await unlockTestContract(
                cmsServer,
                AID,
                'Unlock A.0'
            )
            const a0FormData = unlockedA0.draftRevision?.formData
            a0FormData.contractDocuments = [
                {
                    name: 'contractDocument.pdf',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: 'fakesha',
                    dateAdded: new Date(),
                },
            ]
            a0FormData.submissionDescription = 'DESC A1'
            await updateTestContractDraftRevision(
                stateServer,
                AID,
                unlockedA0.draftRevision?.updatedAt,
                a0FormData
            )
            const unlockedA0Contract = await fetchTestContract(stateServer, AID)
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
            const unlockedB0 = await unlockTestContract(
                cmsServer,
                BID,
                'Unlock B.0'
            )
            const b0FormData = unlockedB0.draftRevision?.formData
            b0FormData.contractDocuments = [
                {
                    name: 'contractDocument.pdf',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: 'fakesha',
                    dateAdded: new Date(),
                },
            ]
            b0FormData.submissionDescription = 'DESC B1'

            await updateTestContractDraftRevision(
                stateServer,
                BID,
                unlockedB0.draftRevision?.updatedAt,
                b0FormData
            )

            const unlockedB0Contract = await fetchTestContract(stateServer, BID)
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

            await updateTestDraftRatesOnContract(
                stateServer,
                b0RatesUpdatesWith4
            )

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
            const unlockedC0 = await unlockTestContract(
                cmsServer,
                CID,
                'Unlock C.0'
            )
            const c0FormData = unlockedC0.draftRevision?.formData
            c0FormData.submissionDescription = 'DESC C1'
            c0FormData.contractDocuments = [
                {
                    name: 'contractDocument.pdf',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: 'fakesha',
                    dateAdded: new Date(),
                },
            ]
            await updateTestContractDraftRevision(
                stateServer,
                CID,
                unlockedC0.draftRevision?.updatedAt,
                c0FormData
            )
            const unlockedC0Contract = await fetchTestContract(stateServer, CID)

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
            expect(as1.rateRevisions[0].formData.rateDateStart).toBe(
                '2001-02-02'
            )
            expect(as1.rateRevisions[1].formData.rateDateStart).toBe(
                '2002-02-02'
            )

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
            expect(as2.rateRevisions[0].formData.rateDateStart).toBe(
                '2001-01-01'
            )
            expect(as2.rateRevisions[1].formData.rateDateStart).toBe(
                '2002-01-01'
            )

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
            expect(bs1.rateRevisions[0].formData.rateDateStart).toBe(
                '2003-02-02'
            )
            expect(bs1.rateRevisions[1].formData.rateDateStart).toBe(
                '2001-02-02'
            )
            expect(bs1.rateRevisions[2].formData.rateDateStart).toBe(
                '2004-02-02'
            )
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
            expect(bs2.rateRevisions[0].formData.rateDateStart).toBe(
                '2003-02-02'
            )
            expect(bs2.rateRevisions[1].formData.rateDateStart).toBe(
                '2001-02-02'
            )
            expect(bs2.rateRevisions[2].formData.rateDateStart).toBe(
                '2004-01-01'
            )
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
            expect(bs3.rateRevisions[0].formData.rateDateStart).toBe(
                '2003-01-01'
            )
            expect(bs3.rateRevisions[1].formData.rateDateStart).toBe(
                '2001-02-02'
            )
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
            expect(bs4.rateRevisions[0].formData.rateDateStart).toBe(
                '2003-01-01'
            )
            expect(bs4.rateRevisions[1].formData.rateDateStart).toBe(
                '2001-01-01'
            )
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
            expect(cs1.rateRevisions[0].formData.rateDateStart).toBe(
                '2004-02-02'
            )
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
            expect(cs2.rateRevisions[0].formData.rateDateStart).toBe(
                '2002-02-02'
            )
            expect(cs2.rateRevisions[1].formData.rateDateStart).toBe(
                '2004-01-01'
            )
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
            expect(cs3.rateRevisions[0].formData.rateDateStart).toBe(
                '2002-01-01'
            )
            expect(cs3.rateRevisions[1].formData.rateDateStart).toBe(
                '2004-01-01'
            )
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
        })

        it('returns the correct dateAdded for documents', async () => {
            const ldService = testLDService({})
            const prismaClient = await sharedTestPrismaClient()
            const stateServer = await constructTestPostgresServer({
                ldService,
                s3Client: mockS3,
            })
            const cmsServer = await constructTestPostgresServer({
                ldService,
                context: {
                    user: testCMSUser(),
                },
                s3Client: mockS3,
            })

            const dummyDoc = (postfix: string) => {
                return {
                    name: `doc${postfix}.pdf`,
                    s3URL: `s3://bucketname/key/test1${postfix}`,
                    sha256: `fakesha${postfix}`,
                }
            }

            // 1. Submit A0 with Rate1 and Rate2
            const draftA0 = await createAndUpdateTestContractWithoutRates(
                stateServer,
                'FL',
                {
                    contractDocuments: [dummyDoc('c1')],
                    supportingDocuments: [dummyDoc('s1')],
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

            // Change submission date and document dateAdded
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
                    contractDocuments: {
                        updateMany:
                            subA0.contractRevision.formData.contractDocuments.map(
                                (doc) => ({
                                    where: {
                                        id: doc.id!,
                                    },
                                    data: {
                                        dateAdded: new Date('2024-01-01'),
                                    },
                                })
                            ),
                    },
                    supportingDocuments: {
                        updateMany:
                            subA0.contractRevision.formData.supportingDocuments.map(
                                (doc) => ({
                                    where: {
                                        id: doc.id!,
                                    },
                                    data: {
                                        dateAdded: new Date('2024-01-01'),
                                    },
                                })
                            ),
                    },
                },
            })

            // Change rate submission date and document dateAdded
            await prismaClient.rateRevisionTable.update({
                where: {
                    id: rate10.id,
                },
                data: {
                    submitInfo: {
                        update: {
                            updatedAt: new Date('2024-01-01'),
                        },
                    },
                    rateDocuments: {
                        updateMany: rate10.formData.rateDocuments.map(
                            (doc) => ({
                                where: {
                                    id: doc.id!,
                                },
                                data: {
                                    dateAdded: new Date('2024-01-01'),
                                },
                            })
                        ),
                    },
                    supportingDocuments: {
                        updateMany: rate10.formData.supportingDocuments.map(
                            (doc) => ({
                                where: {
                                    id: doc.id!,
                                },
                                data: {
                                    dateAdded: new Date('2024-01-01'),
                                },
                            })
                        ),
                    },
                },
            })

            const fixSubmitA0 = await fetchTestContract(stateServer, AID)
            const contractRev =
                fixSubmitA0.packageSubmissions[0].contractRevision

            expect(contractRev.formData.contractDocuments).toHaveLength(1)
            expect(contractRev.formData.contractDocuments[0].name).toBe(
                'docc1.pdf'
            )
            expect(
                dayjs
                    .tz(
                        contractRev.formData.contractDocuments[0].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            expect(contractRev.formData.supportingDocuments).toHaveLength(1)
            expect(contractRev.formData.supportingDocuments[0].name).toBe(
                'docs1.pdf'
            )
            expect(
                dayjs
                    .tz(
                        contractRev.formData.supportingDocuments[0].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            const rateRev = fixSubmitA0.packageSubmissions[0].rateRevisions[0]

            expect(rateRev.formData.rateDocuments).toHaveLength(1)
            expect(rateRev.formData.rateDocuments[0].name).toBe('docr1.pdf')
            expect(
                dayjs
                    .tz(rateRev.formData.rateDocuments[0].dateAdded, 'UTC')
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            expect(rateRev.formData.supportingDocuments).toHaveLength(1)
            expect(rateRev.formData.supportingDocuments[0].name).toBe(
                'docx1.pdf'
            )
            expect(
                dayjs
                    .tz(
                        rateRev.formData.supportingDocuments[0].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            // 2. Unlock and add more documents
            const unlockedA0Pkg = await unlockTestContract(
                cmsServer,
                AID,
                'Unlock A.0'
            )

            const a0FormData = unlockedA0Pkg.draftRevision.formData
            a0FormData.submissionDescription = 'DESC A1'
            a0FormData.contractDocuments.push(dummyDoc('c2'))
            a0FormData.supportingDocuments.push(dummyDoc('s2'))

            await updateTestContractDraftRevision(
                stateServer,
                AID,
                unlockedA0Pkg.draftRevision.updatedAt,
                clearMetadataFromContractFormData(a0FormData)
            )

            const unlockedA0Contract = await fetchTestContract(stateServer, AID)

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
            const rateUpdated = a1sub.rateRevisions[0]

            const dummyDocC2 =
                a1sub.contractRevision.formData.contractDocuments.find(
                    (doc) => doc.name === 'docc2.pdf'
                )
            const dummyDocS2 =
                a1sub.contractRevision.formData.supportingDocuments.find(
                    (doc) => doc.name === 'docs2.pdf'
                )
            const dummyRateDocR2 = rateUpdated.formData.rateDocuments.find(
                (doc) => doc.name === 'docr2.pdf'
            )
            const dummyRateDocS2 =
                rateUpdated.formData.supportingDocuments.find(
                    (doc) => doc.name === 'docx2.pdf'
                )

            if (!dummyDocC2 || !dummyDocS2) {
                throw new Error(
                    'Unexpected error: Additional docs where not found in submission'
                )
            }

            if (!dummyRateDocR2 || !dummyRateDocS2) {
                throw new Error(
                    'Unexpected error: Additional docs where not found in submission'
                )
            }

            // Change submission date and document dateAdded for new docs only.
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
                    contractDocuments: {
                        update: {
                            where: {
                                id: dummyDocC2.id!,
                            },
                            data: {
                                dateAdded: new Date('2024-02-02'),
                            },
                        },
                    },
                    supportingDocuments: {
                        update: {
                            where: {
                                id: dummyDocS2.id!,
                            },
                            data: {
                                dateAdded: new Date('2024-02-02'),
                            },
                        },
                    },
                },
            })

            // Change rate submission date and document added for new docs only
            await prismaClient.rateRevisionTable.update({
                where: {
                    id: rateUpdated.id,
                },
                data: {
                    submitInfo: {
                        update: {
                            updatedAt: new Date('2024-02-02'),
                        },
                    },
                    rateDocuments: {
                        update: {
                            where: {
                                id: dummyRateDocR2.id!,
                            },
                            data: {
                                dateAdded: new Date('2024-02-02'),
                            },
                        },
                    },
                    supportingDocuments: {
                        update: {
                            where: {
                                id: dummyRateDocS2.id!,
                            },
                            data: {
                                dateAdded: new Date('2024-02-02'),
                            },
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
            expect(
                dayjs
                    .tz(
                        contractRevA1.formData.contractDocuments[0].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            expect(contractRevA1.formData.contractDocuments[1].name).toBe(
                'docc2.pdf'
            )
            expect(
                dayjs
                    .tz(
                        contractRevA1.formData.contractDocuments[1].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-02-02')

            expect(contractRevA1.formData.supportingDocuments).toHaveLength(2)
            expect(contractRevA1.formData.supportingDocuments[0].name).toBe(
                'docs1.pdf'
            )
            expect(
                dayjs
                    .tz(
                        contractRevA1.formData.supportingDocuments[0].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            expect(contractRevA1.formData.supportingDocuments[1].name).toBe(
                'docs2.pdf'
            )
            expect(
                dayjs
                    .tz(
                        contractRevA1.formData.supportingDocuments[1].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-02-02')

            const rateRevA1 =
                fixedContractA1.packageSubmissions[0].rateRevisions[0]

            expect(rateRevA1.formData.rateDocuments).toHaveLength(2)
            expect(rateRevA1.formData.rateDocuments[0].name).toBe('docr1.pdf')
            expect(
                dayjs
                    .tz(rateRevA1.formData.rateDocuments[0].dateAdded, 'UTC')
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            expect(rateRevA1.formData.rateDocuments[1].name).toBe('docr2.pdf')
            expect(
                dayjs
                    .tz(rateRevA1.formData.rateDocuments[1].dateAdded, 'UTC')
                    .format('YYYY-MM-DD')
            ).toBe('2024-02-02')

            expect(rateRevA1.formData.supportingDocuments).toHaveLength(2)
            expect(rateRevA1.formData.supportingDocuments[0].name).toBe(
                'docx1.pdf'
            )
            expect(
                dayjs
                    .tz(
                        rateRevA1.formData.supportingDocuments[0].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-01-01')

            expect(rateRevA1.formData.supportingDocuments[1].name).toBe(
                'docx2.pdf'
            )
            expect(
                dayjs
                    .tz(
                        rateRevA1.formData.supportingDocuments[1].dateAdded,
                        'UTC'
                    )
                    .format('YYYY-MM-DD')
            ).toBe('2024-02-02')
        })

        it('returns an error if a CMS user attempts to call submitContract', async () => {
            const stateServer = await constructTestPostgresServer()
            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: testCMSUser(),
                },
                s3Client: mockS3,
            })

            const contract = await createSubmitAndUnlockTestContract(
                stateServer,
                cmsServer
            )

            const input = {
                contractID: contract.id,
                submittedReason: 'Test cms user calling state user func',
            }

            const response = await executeGraphQLOperation(cmsServer, {
                query: SubmitContractDocument,
                variables: { input },
            })

            expect(response.errors).toBeDefined()
            expect(response.errors && response.errors[0].message).toBe(
                'user not authorized to fetch state data'
            )
        })

        it('returns an error if it is incomplete', async () => {
            const stateServer = await constructTestPostgresServer()

            const contract = await createTestContract(stateServer)

            await updateTestContractDraftRevision(
                stateServer,
                contract.id,
                contract.draftRevision?.updatedAt,
                {
                    contractDocuments: [
                        {
                            name: 'testdoc',
                            s3URL: 's3://bucketname/key/contractDocument1.pdf',
                            sha256: 'fakesha14',
                        },
                    ],
                    programIDs: [defaultFloridaProgram().id],
                    submissionType: 'CONTRACT_ONLY',
                    statutoryRegulatoryAttestationDescription:
                        'this is required',

                    stateContacts: [],
                    supportingDocuments: [],
                    managedCareEntities: [],
                    federalAuthorities: [],
                }
            )

            const response = await executeGraphQLOperation(stateServer, {
                query: SubmitContractDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                    },
                },
            })

            expect(response.errors).toBeDefined()
        })

        it('returns an error if a CONTRACT_AND_RATES submission is missing rates', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            const draft =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const response = await executeGraphQLOperation(stateServer, {
                query: SubmitContractDocument,
                variables: {
                    input: {
                        contractID: draft.id,
                    },
                },
            })

            expect(response.errors).toBeDefined()
            expect(response.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `Attempted to submit a contract and rates contract without rates: ${draft.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues: draft.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])
        })

        describe('emails', () => {
            it('sends two emails', async () => {
                const mockEmailer = testEmailer()

                const server = await constructTestPostgresServer({
                    emailer: mockEmailer,
                })

                await createAndSubmitTestContractWithRate(server)
                expect(mockEmailer.sendEmail).toHaveBeenCalledTimes(2)
            })

            it('send CMS email to CMS if submission is valid', async () => {
                const config = testEmailConfig()
                const mockEmailer = testEmailer(config)
                const server = await constructTestPostgresServer({
                    emailer: mockEmailer,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: testCMSUser(),
                    },
                })

                const assignedUsers = [
                    testCMSUser({
                        givenName: 'Roku',
                        email: 'roku@example.com',
                    }),
                    testCMSUser({
                        givenName: 'Izumi',
                        email: 'izumi@example.com',
                    }),
                ]

                const assignedUserIDs = assignedUsers.map((u) => u.id)
                const stateAnalystsEmails = assignedUsers.map((u) => u.email)
                await createDBUsersWithFullData(assignedUsers)
                await updateTestStateAssignments(
                    cmsServer,
                    'FL',
                    assignedUserIDs
                )

                const submitResult =
                    await createAndSubmitTestContractWithRate(server)

                const contractName =
                    submitResult?.packageSubmissions[0].contractRevision
                        .contractName

                const cmsEmails = [
                    ...config.devReviewTeamEmails,
                    ...stateAnalystsEmails,
                ]

                // email subject line is correct for CMS email
                expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `New Managed Care Submission: ${contractName}`
                        ),
                        sourceEmail: config.emailSource,
                        toAddresses: expect.arrayContaining(
                            Array.from(cmsEmails)
                        ),
                    })
                )
            })

            it('send CMS email on contract only re-submission', async () => {
                const config = testEmailConfig()
                const mockEmailer = testEmailer(config)
                //mock invoke email submit lambda
                const server = await constructTestPostgresServer({
                    emailer: mockEmailer,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: testCMSUser(),
                    },
                    emailer: mockEmailer,
                })

                const assignedUsers = [
                    testCMSUser({
                        givenName: 'Roku',
                        email: 'roku@example.com',
                    }),
                    testCMSUser({
                        givenName: 'Izumi',
                        email: 'izumi@example.com',
                    }),
                ]

                const assignedUserIDs = assignedUsers.map((u) => u.id)
                const stateAnalystsEmails = assignedUsers.map((u) => u.email)
                await createDBUsersWithFullData(assignedUsers)
                await updateTestStateAssignments(
                    cmsServer,
                    'FL',
                    assignedUserIDs
                )

                const draft1 = await createAndUpdateTestContractWithoutRates(
                    server,
                    undefined,
                    { submissionType: 'CONTRACT_ONLY' }
                )
                await submitTestContract(server, draft1.id)
                await unlockTestContract(
                    cmsServer,
                    draft1.id,
                    'unlock to resubmit'
                )
                const submit1 = await submitTestContract(
                    server,
                    draft1.id,
                    'resubmit'
                )

                const contractName =
                    submit1.packageSubmissions[0].contractRevision.contractName

                const cmsEmails = [
                    ...config.devReviewTeamEmails,
                    ...stateAnalystsEmails,
                ]

                // email subject line is correct for CMS email
                expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
                    5,
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `${contractName} was resubmitted`
                        ),
                        sourceEmail: config.emailSource,
                        toAddresses: expect.arrayContaining(
                            Array.from(cmsEmails)
                        ),
                    })
                )
            })

            it('send CMS email to CMS from the database', async () => {
                const prismaClient = await sharedTestPrismaClient()
                const postgresStore = NewPostgresStore(prismaClient)

                const config = testEmailConfig()
                const mockEmailer = testEmailer(config)
                //mock invoke email submit lambda
                const server = await constructTestPostgresServer({
                    store: postgresStore,
                    emailer: mockEmailer,
                })
                const cmsServer = await constructTestPostgresServer({
                    store: postgresStore,
                    context: {
                        user: testCMSUser(),
                    },
                })

                // add some users to the db, assign them to the state
                const assignedUsers = [
                    testCMSUser({
                        givenName: 'Roku',
                        email: 'roku@example.com',
                    }),
                    testCMSUser({
                        givenName: 'Izumi',
                        email: 'izumi@example.com',
                    }),
                ]
                await createDBUsersWithFullData(assignedUsers)

                const assignedUserIDs = assignedUsers.map((u) => u.id)
                const assignedUserEmails = assignedUsers.map((u) => u.email)

                await updateTestStateAssignments(
                    cmsServer,
                    'FL',
                    assignedUserIDs
                )
                const submit1 =
                    await createAndSubmitTestContractWithRate(server)
                const contractName =
                    submit1.packageSubmissions[0].contractRevision.contractName

                const cmsEmails = [
                    ...config.devReviewTeamEmails,
                    ...assignedUserEmails,
                ]

                // email subject line is correct for CMS email
                expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `New Managed Care Submission: ${contractName}`
                        ),
                        sourceEmail: config.emailSource,
                        toAddresses: expect.arrayContaining(
                            Array.from(cmsEmails)
                        ),
                    })
                )
            })

            it('does send email when request for state analysts emails fails', async () => {
                const config = testEmailConfig()
                const mockEmailer = testEmailer(config)
                //mock invoke email submit lambda
                const server = await constructTestPostgresServer({
                    emailer: mockEmailer,
                })
                const draft = await createAndUpdateTestContractWithoutRates(
                    server,
                    undefined,
                    { submissionType: 'CONTRACT_ONLY' }
                )
                const draftID = draft.id

                await executeGraphQLOperation(server, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: draftID,
                        },
                    },
                })

                expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
                    expect.objectContaining({
                        toAddresses: expect.arrayContaining(
                            Array.from(config.devReviewTeamEmails)
                        ),
                    })
                )
            })

            // TODO: reimplement this test without using jest
            // it('does log error when request for state specific analysts emails failed', async () => {
            //     const consoleErrorSpy = jest.spyOn(console, 'error')
            //     const error = {
            //         error: 'error finding state users',
            //         message: 'getStateAnalystsEmails failed',
            //         operation: 'getStateAnalystsEmails',
            //         status: 'ERROR',
            //     }

            //     const brokenStore = NewPostgresStore(await sharedTestPrismaClient())
            //     brokenStore.findStateAssignedUsers = async () => {
            //         return new Error('error finding state users')
            //     }

            //     const server = await constructTestPostgresServer({
            //         store: brokenStore,
            //     })
            //     const draft = await createAndUpdateTestContractWithoutRates(server)
            //     const draftID = draft.id

            //     await server.executeOperation({
            //         query: SubmitContractDocument,
            //         variables: {
            //             input: {
            //                 contractID: draftID,
            //             },
            //         },
            //     })

            //     expect(consoleErrorSpy).toHaveBeenCalledWith(error)
            // })

            it('send state email to submitter if submission is valid', async () => {
                const mockEmailer = testEmailer()
                const server = await constructTestPostgresServer({
                    emailer: mockEmailer,
                    context: {
                        user: testStateUser({
                            email: 'notspiderman@example.com',
                        }),
                    },
                })
                const draft = await createAndUpdateTestContractWithRate(server)
                const draftID = draft.id

                const submitResult = await executeGraphQLOperation(server, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: draftID,
                        },
                    },
                })

                expect(submitResult.errors).toBeUndefined()

                const currentRevision =
                    submitResult?.data?.submitContract?.contract
                        .packageSubmissions[0].contractRevision

                const name = currentRevision.contractName

                expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `${name} was sent to CMS`
                        ),
                        toAddresses: expect.arrayContaining([
                            'notspiderman@example.com',
                        ]),
                    })
                )
            })

            it('send CMS email to CMS on valid resubmission', async () => {
                const config = testEmailConfig()
                const mockEmailer = testEmailer(config)
                //mock invoke email submit lambda
                const stateServer = await constructTestPostgresServer({
                    emailer: mockEmailer,
                })

                const stateSubmission =
                    await createAndSubmitTestContractWithRate(stateServer)
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: testCMSUser(),
                    },
                })

                await unlockTestContract(
                    cmsServer,
                    stateSubmission.id,
                    'Test unlock reason.'
                )

                const submitContract = await submitTestContract(
                    stateServer,
                    stateSubmission.id,
                    'Test resubmitted reason'
                )

                const currentRevision =
                    submitContract.packageSubmissions[0].contractRevision

                const name = currentRevision.contractName

                // email subject line is correct for CMS email and contains correct email body text
                expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `${name} was resubmitted`
                        ),
                        sourceEmail: config.emailSource,
                        bodyText: expect.stringContaining(
                            `The state completed their edits on submission ${name}`
                        ),
                        toAddresses: expect.arrayContaining(
                            Array.from(config.devReviewTeamEmails)
                        ),
                    })
                )
            })

            it('send state email to state contacts and all submitters on valid resubmission', async () => {
                const config = testEmailConfig()
                const mockEmailer = testEmailer(config)
                //mock invoke email submit lambda
                const stateUser1 = testStateUser({
                    email: 'alsonotspiderman@example.com',
                })
                const stateUser2 = testStateUser({
                    email: 'notspiderman@example.com',
                })
                const cmsUser = testCMSUser()
                await createDBUsersWithFullData([
                    stateUser1,
                    stateUser2,
                    cmsUser,
                ])
                const stateServer = await constructTestPostgresServer({
                    context: {
                        user: stateUser1,
                    },
                })

                const stateServerTwo = await constructTestPostgresServer({
                    emailer: mockEmailer,
                    context: {
                        user: stateUser2,
                    },
                })

                const stateSubmission = await createAndSubmitTestContract(
                    stateServer,
                    undefined,
                    { submissionType: 'CONTRACT_ONLY' }
                )

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                })

                await unlockTestContract(
                    cmsServer,
                    stateSubmission.id,
                    'Test unlock reason.'
                )

                const submitResult = await resubmitTestContract(
                    stateServerTwo,
                    stateSubmission.id,
                    'Test resubmission reason'
                )

                const currentRevision =
                    submitResult?.packageSubmissions[0].contractRevision

                const name = currentRevision.contractName

                // email subject line is correct for STATE email and contains correct email body text
                expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
                    2, // The second email is the state email
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `${name} was resubmitted`
                        ),
                        sourceEmail: config.emailSource,
                        toAddresses: expect.arrayContaining([
                            'alsonotspiderman@example.com',
                            'notspiderman@example.com',
                            currentRevision.formData.stateContacts[0].email,
                        ]),
                    })
                )
            })

            it('does not send any emails if submission fails', async () => {
                const mockEmailer = testEmailer()
                const server = await constructTestPostgresServer({
                    emailer: mockEmailer,
                })
                // Invalid contract ID
                const draftID = '123'

                const submitResult = await executeGraphQLOperation(server, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: draftID,
                        },
                    },
                })

                expect(submitResult.errors).toBeDefined()
                expect(mockEmailer.sendEmail).not.toHaveBeenCalled()
            })

            it('uses email settings from database with remove-parameter-store flag on', async () => {
                const prismaClient = await sharedTestPrismaClient()

                // Restore email settings
                await prismaClient.emailSettings.update({
                    where: { id: 1 },
                    data: {
                        emailSource: 'mc-review@cms.hhs.gov',
                        devReviewTeamEmails: [
                            'mc-review-qa+DevTeam@truss.works',
                        ],
                        cmsReviewHelpEmailAddress: [
                            'mc-review-qa+MCOGDMCOActionsHelp@truss.works',
                        ],
                        cmsRateHelpEmailAddress: [
                            'mc-review-qa+MMCratesettingHelp@truss.works',
                        ],
                        oactEmails: [
                            'mc-review-qa+OACTdev1@truss.works',
                            'mc-review-qa+OACTdev2@truss.works',
                        ],
                        dmcpReviewEmails: [
                            'mc-review-qa+DMCPreviewdev1@truss.works',
                            'mc-review-qa+DMCPreivewdev2@truss.works',
                        ],
                        dmcpSubmissionEmails: [
                            'mc-review-qa+DMCPsubmissiondev1@truss.works',
                            'mc-review-qa+DMCPsubmissiondev2@truss.works',
                        ],
                        dmcoEmails: [
                            'mc-review-qa+DMCO1@truss.works',
                            'mc-review-qa+DMCO2@truss.works',
                        ],
                        helpDeskEmail: [
                            'mc-review-qa+MC_Review_HelpDesk@truss.works',
                        ],
                        applicationSettingsId: 1,
                    },
                })

                const store = NewPostgresStore(prismaClient)
                const ldService = testLDService({
                    'remove-parameter-store': true,
                })
                const mockEmailer = await testEmailerFromDatabase(
                    store,
                    undefined
                )
                const stateUser = testStateUser()
                await createDBUsersWithFullData([stateUser])

                const stateServer = await constructTestPostgresServer({
                    context: {
                        user: stateUser,
                    },
                    ldService,
                    emailer: mockEmailer,
                })

                const submitResult =
                    await createAndSubmitTestContractWithRate(stateServer)

                const currentRevision =
                    submitResult.packageSubmissions[0].contractRevision

                const name = currentRevision.contractName

                expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
                    1,
                    expect.objectContaining({
                        subject: expect.stringContaining(
                            `New Managed Care Submission: ${name}`
                        ),
                        sourceEmail: expect.stringContaining(
                            'mc-review@cms.hhs.gov'
                        ),
                        toAddresses: expect.arrayContaining([
                            expect.stringContaining(
                                'mc-review-qa+DevTeam@truss.works'
                            ),
                            expect.stringContaining(
                                'mc-review-qa+DMCPsubmissiondev1@truss.works'
                            ),
                            expect.stringContaining(
                                'mc-review-qa+DMCPsubmissiondev2@truss.works'
                            ),
                        ]),
                    })
                )
            })

            // TODO: reimplement this test without using jest
            // it('errors when SES email has failed.', async () => {
            //     const mockEmailer = testEmailer()

            //     jest.spyOn(awsSESHelpers, 'testSendSESEmail').mockImplementation(
            //         async () => {
            //             throw new Error('Network error occurred')
            //         }
            //     )

            //     //mock invoke email submit lambda
            //     const server = await constructTestPostgresServer({
            //         emailer: mockEmailer,
            //     })
            //     const draft = await createAndUpdateTestContractWithoutRates(server)
            //     const draftID = draft.id

            //     const submitResult = await server.executeOperation({
            //         query: SubmitContractDocument,
            //         variables: {
            //             input: {
            //                 contractID: draftID,
            //             },
            //         },
            //     })

            //     // expect errors from submission
            //     // expect(submitResult.errors).toBeDefined()

            //     // expect sendEmail to have been called, so we know it did not error earlier
            //     expect(mockEmailer.sendEmail).toHaveBeenCalled()

            //     jest.resetAllMocks()

            //     // expect correct graphql error.
            //     expect(submitResult.errors?.[0].message).toBe('Email failed')
            // })
        })

        describe('Feature flagged 4348 attestation question test', () => {
            const ldService = testLDService({
                '438-attestation': true,
            })

            it('errors when contract 4348 attestation question is undefined', async () => {
                const server = await constructTestPostgresServer({
                    ldService: ldService,
                })

                // setup
                const initialContract =
                    await createAndUpdateTestContractWithoutRates(
                        server,
                        'FL',
                        {
                            statutoryRegulatoryAttestationDescription:
                                undefined,
                            statutoryRegulatoryAttestation: undefined,
                        }
                    )

                await new Promise((resolve) => setTimeout(resolve, 2000))

                // submit
                const submitResult = await executeGraphQLOperation(server, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: initialContract.id,
                        },
                    },
                })

                expect(submitResult.errors).toBeDefined()
                expect(submitResult.errors?.[0].message).toContain('required')
            }, 20000)

            it('errors when contract 4348 attestation question is false without a description', async () => {
                const server = await constructTestPostgresServer({
                    ldService: ldService,
                })

                // setup
                const initialContract =
                    await createAndUpdateTestContractWithoutRates(
                        server,
                        'FL',
                        {
                            statutoryRegulatoryAttestationDescription:
                                undefined,
                            statutoryRegulatoryAttestation: false,
                        }
                    )

                await new Promise((resolve) => setTimeout(resolve, 2000))

                // submit
                const submitResult = await executeGraphQLOperation(server, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: initialContract.id,
                        },
                    },
                })

                expect(submitResult.errors).toBeDefined()
                expect(submitResult.errors?.[0].message).toContain('Required')
            }, 20000)

            it('successfully submits when contract 4348 attestation question is valid', async () => {
                const server = await constructTestPostgresServer({
                    ldService: ldService,
                })

                // setup
                const initialContract =
                    await createAndUpdateTestContractWithRate(server, 'FL', {
                        statutoryRegulatoryAttestationDescription:
                            'A valid description',
                        statutoryRegulatoryAttestation: false,
                    })

                await new Promise((resolve) => setTimeout(resolve, 2000))

                // submit
                const submitResult = await executeGraphQLOperation(server, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: initialContract.id,
                        },
                    },
                })

                expect(submitResult.errors).toBeUndefined()
            }, 20000)
        })
    })

    describe('EQRO contract tests', () => {
        it('submits a EQRO contract and preserves expected data', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })
            const draft = await createAndUpdateTestEQROContract(stateServer)
            const contract = await submitTestContract(stateServer, draft.id)
            // check contract metadata
            const today = new Date()
            // const expectedDate = today.toISOString().split('T')[0]
            expect(contract.draftRevision).toBeNull()
            expect(contract.initiallySubmittedAt).toBeDefined()
            expect(
                Math.abs(
                    contract.initiallySubmittedAt.getTime() - today.getTime()
                )
            ).toBeLessThan(1000)
            expect(contract.packageSubmissions).toHaveLength(1)
            expect(contract.status).toBe('SUBMITTED')
            expect(contract.contractSubmissionType).toBe('EQRO')

            // check page submission metadata
            const sub = contract.packageSubmissions[0]
            expect(sub.cause).toBe('CONTRACT_SUBMISSION')
            expect(sub.submitInfo.updatedReason).toBe('Initial submission')
            expect(sub.submittedRevisions).toHaveLength(1)

            // check form data is unchanged
            const draftFormData = draft.draftRevision!.formData
            const submittedFormData = sub.contractRevision.formData

            // after submit, the documents have a "date added" that doesn't exist pre-submit
            expect(
                submittedFormData.contractDocuments[0].dateAdded
            ).toBeTruthy()
            submittedFormData.contractDocuments[0].dateAdded = null

            expect(submittedFormData).toEqual({
                ...draftFormData,
                contractDocuments: expect.arrayContaining(
                    draftFormData.contractDocuments.map((doc) =>
                        expect.objectContaining({
                            ...doc,
                            id: expect.any(String),
                        })
                    )
                ),
                supportingDocuments: expect.arrayContaining(
                    draftFormData.supportingDocuments.map((doc) =>
                        expect.objectContaining({
                            ...doc,
                            id: expect.any(String),
                        })
                    )
                ),
                eqroNewContractor: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
                eqroProvisionChipEqrRelatedActivities: true,
                eqroProvisionMcoEqrOrRelatedActivities: true,
            })
        })

        it('returns an error if EQRO submission submissionType is not CONTRACT_ONLY', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })
            const draftWithWrongSubType = await createAndUpdateTestEQROContract(
                stateServer,
                undefined,
                {
                    submissionType: 'CONTRACT_AND_RATES',
                }
            )
            const response = await executeGraphQLOperation(stateServer, {
                query: SubmitContractDocument,
                variables: {
                    input: {
                        contractID: draftWithWrongSubType.id,
                    },
                },
            })

            expect(response.errors).toBeDefined()
            expect(response.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `EQRO submissions must be contract only and not include any rates: ${draftWithWrongSubType.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues: draftWithWrongSubType.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])
        })

        it('returns an error if a base MCO submission does not include the required fields', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            //Asserting errors for missing eqroNewContractor field - draft includes MCO by default
            const draftWithMissingNewContractor =
                await createAndUpdateTestEQROContract(stateServer, undefined, {
                    populationCovered: 'MEDICAID_AND_CHIP',
                    eqroNewContractor: null,
                })
            const missingNewContractorResponse = await executeGraphQLOperation(
                stateServer,
                {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID: draftWithMissingNewContractor.id,
                        },
                    },
                }
            )

            expect(missingNewContractorResponse.errors).toBeDefined()
            expect(missingNewContractorResponse.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `eqroNewContractor can not be undefined for a EQRO contract submission: ${draftWithMissingNewContractor.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues: draftWithMissingNewContractor.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])

            //Asserting errors for missing eqroProvisionMcoNewOptionalActivity field - draft includes MCO by default
            const draftWithMissingMcoNewOptionalActivity =
                await createAndUpdateTestEQROContract(stateServer, undefined, {
                    populationCovered: 'MEDICAID_AND_CHIP',
                    eqroProvisionMcoNewOptionalActivity: null,
                })
            const missingMcoNewOptionalActivityResponse =
                await executeGraphQLOperation(stateServer, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID:
                                draftWithMissingMcoNewOptionalActivity.id,
                        },
                    },
                })

            expect(missingMcoNewOptionalActivityResponse.errors).toBeDefined()
            expect(missingMcoNewOptionalActivityResponse.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `eqroProvisionMcoNewOptionalActivity can not be undefined for a EQRO contract submission: ${draftWithMissingMcoNewOptionalActivity.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues:
                            draftWithMissingMcoNewOptionalActivity.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])

            //Asserting errors for missing eqroProvisionNewMcoEqrRelatedActivities field - draft includes MCO by default
            const draftWithMissingNewMcoEqrRelatedActivities =
                await createAndUpdateTestEQROContract(stateServer, undefined, {
                    populationCovered: 'MEDICAID_AND_CHIP',
                    eqroProvisionNewMcoEqrRelatedActivities: null,
                })
            const missingNewMcoEqrRelatedActivitiesResponse =
                await executeGraphQLOperation(stateServer, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID:
                                draftWithMissingNewMcoEqrRelatedActivities.id,
                        },
                    },
                })

            expect(
                missingNewMcoEqrRelatedActivitiesResponse.errors
            ).toBeDefined()
            expect(missingNewMcoEqrRelatedActivitiesResponse.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `eqroProvisionNewMcoEqrRelatedActivities can not be undefined for a EQRO contract submission: ${draftWithMissingNewMcoEqrRelatedActivities.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues:
                            draftWithMissingNewMcoEqrRelatedActivities.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])
        })

        it('returns an error if an amendment contract with CHIP coverage excluding MCO lacks the required fields', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            //Asserting errors for missing eqroProvisionChipEqrRelatedActivities field
            const draftWithMissingChipEqrRelatedActivities =
                await createAndUpdateTestEQROContract(stateServer, undefined, {
                    contractType: 'AMENDMENT',
                    populationCovered: 'MEDICAID_AND_CHIP',
                    managedCareEntities: ['PAHP'],
                    eqroProvisionChipEqrRelatedActivities: null,
                })
            const missingChipEqrRelatedActivitiesResponse =
                await executeGraphQLOperation(stateServer, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID:
                                draftWithMissingChipEqrRelatedActivities.id,
                        },
                    },
                })

            expect(missingChipEqrRelatedActivitiesResponse.errors).toBeDefined()
            expect(missingChipEqrRelatedActivitiesResponse.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `eqroProvisionChipEqrRelatedActivities can not be undefined for an amendment contract with chip populations included: ${draftWithMissingChipEqrRelatedActivities.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues:
                            draftWithMissingChipEqrRelatedActivities.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])
        })

        it('returns an error if an amendment contract which includes MCO lacks the required fields', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            //Asserting errors for missing eqroProvisionChipEqrRelatedActivities field
            const draftWithMissingMcoEqrOrRelatedActivities =
                await createAndUpdateTestEQROContract(stateServer, undefined, {
                    contractType: 'AMENDMENT',
                    eqroProvisionMcoEqrOrRelatedActivities: null,
                })
            const missingChipEqrRelatedActivitiesResponse =
                await executeGraphQLOperation(stateServer, {
                    query: SubmitContractDocument,
                    variables: {
                        input: {
                            contractID:
                                draftWithMissingMcoEqrOrRelatedActivities.id,
                        },
                    },
                })

            expect(missingChipEqrRelatedActivitiesResponse.errors).toBeDefined()
            expect(missingChipEqrRelatedActivitiesResponse.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(
                        `eqroProvisionMcoEqrOrRelatedActivities can not be undefined for an amendment contract that includes MCO: ${draftWithMissingMcoEqrOrRelatedActivities.id}`
                    ),
                    path: ['submitContract'],
                    extensions: expect.objectContaining({
                        argumentName: 'contractID',
                        argumentValues:
                            draftWithMissingMcoEqrOrRelatedActivities.id,
                        code: 'BAD_USER_INPUT',
                    }),
                }),
            ])
        })
    })
})
