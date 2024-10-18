import {
    constructTestPostgresServer,
    defaultFloridaProgram,
    defaultFloridaRateProgram,
    unlockTestHealthPlanPackage,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import UPDATE_DRAFT_CONTRACT_RATES from 'app-graphql/src/mutations/updateDraftContractRates.graphql'
import UNLOCK_CONTRACT from '../../../../app-graphql/src/mutations/unlockContract.graphql'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'
import { expectToBeDefined } from '../../testHelpers/assertionHelpers'

import {
    createDBUsersWithFullData,
    iterableCmsUsersMockData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContract,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createSubmitAndUnlockTestContract,
    fetchTestContract,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { addLinkedRateToTestContract, addNewRateToTestContract, updateRatesInputFromDraftContract, updateTestDraftRatesOnContract } from '../../testHelpers/gqlRateHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { packageName } from '../../common-code/healthPlanFormDataType'
import { generateRateCertificationName } from '../rate/generateRateCertificationName'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
import { nullsToUndefined } from '../../domain-models/nullstoUndefined'
import { NewPostgresStore } from '../../postgres'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('unlockContract', () => {
    const mockS3 = testS3Client()
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe.each(iterableCmsUsersMockData)(
        '$userRole unlockContract tests',
        ({ mockUser }) => {
            it('changes contract status to UNLOCKED and creates a new draft revision with unlock info', async () => {
                const stateServer = await constructTestPostgresServer({
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: mockUser(),
                    },
                    ldService,
                    s3Client: mockS3,
                })
                const draft =
                    await createAndUpdateTestContractWithoutRates(stateServer)
                const draftWithRates = await addNewRateToTestContract(
                    stateServer,
                    draft
                )

                const draftRates = draftWithRates.draftRates

                expect(draftRates).toHaveLength(1)

                const contract = await submitTestContract(stateServer, draft.id)
                const unlockedContract = await unlockTestContract(
                    cmsServer,
                    contract.id,
                    'test unlock'
                )

                expect(unlockedContract.draftRevision).toBeDefined()

                expect(unlockedContract.status).toBe('UNLOCKED')

                if (!unlockedContract.draftRevision) {
                    throw new Error('no draftrate')
                }
                if (!unlockedContract.draftRevision.unlockInfo) {
                    throw new Error('no unlockinfo')
                }

                expect(
                    unlockedContract.draftRevision.unlockInfo.updatedReason
                ).toBe('test unlock')
            })

            it('returns status error if rate is actively being edited in draft', async () => {
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: mockUser(),
                    },
                    ldService,
                    s3Client: mockS3,
                })

                const contract = await createSubmitAndUnlockTestContract(
                    stateServer,
                    cmsServer
                )

                // Try to unlock the contract again
                const unlockResult2 = await cmsServer.executeOperation({
                    query: UNLOCK_CONTRACT,
                    variables: {
                        input: {
                            contractID: contract.id,
                            unlockedReason: 'Super duper good reason.',
                        },
                    },
                })

                expectToBeDefined(unlockResult2.errors)
                expect(unlockResult2.errors[0].message).toBe(
                    'Attempted to unlock contract with wrong status'
                )
            })


    it('can unlock resubmit complex contracts to remove child rates', async () => {
        const ldService = testLDService({})

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

        }
    )

    it('handles unlock and editing rates', async () => {
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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

    it('returns unauthorized error for state user', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const unlockResult = await stateServer.executeOperation({
            query: UNLOCK_CONTRACT,
            variables: {
                input: {
                    contractID: contract.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expectToBeDefined(unlockResult.errors)
        expect(unlockResult.errors[0].message).toBe(
            'user not authorized to unlock contract'
        )
    })

    it('send email to CMS when unlocking contract only submission succeeds', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            emailer: mockEmailer,
        })

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestContract(stateServer)
        // Unlock
        const unlockResult = await unlockTestContract(
            cmsServer,
            stateSubmission.id,
            'Super duper good reason.'
        )

        const currentRevision = unlockResult.draftRevision

        const programs = [defaultFloridaProgram()]
        const name = packageName(
            unlockResult.stateCode,
            unlockResult.stateNumber,
            currentRevision.formData.programIDs,
            programs
        )
        const stateAnalystsEmails = getTestStateAnalystsEmails(
            unlockResult.stateCode
        )

        const cmsEmails = [
            ...config.devReviewTeamEmails,
            ...stateAnalystsEmails,
        ]

        // email subject line is correct for CMS email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was unlocked`),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
            })
        )
    })

    it('send email to CMS when unlocking submission succeeds', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            emailer: mockEmailer,
        })

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestContractWithRate(
            stateServer,
            {
                riskBasedContract: true,
            }
        )
        // Unlock
        const unlockResult = await unlockTestContract(
            cmsServer,
            stateSubmission.id,
            'Super duper good reason.'
        )

        const currentRevision = unlockResult.draftRevision

        const programs = [defaultFloridaProgram()]
        const ratePrograms = [defaultFloridaRateProgram()]
        const name = packageName(
            unlockResult.stateCode,
            unlockResult.stateNumber,
            currentRevision.formData.programIDs,
            programs
        )

        const firstRateFormData =
            unlockResult.draftRates[0].draftRevision?.formData
        if (!firstRateFormData) {
            throw new Error('should have a first rate with form data')
        }

        const convertedFirstRateFormData = nullsToUndefined(
            Object.assign({}, firstRateFormData)
        )

        const rateName = generateRateCertificationName(
            convertedFirstRateFormData,
            unlockResult.stateCode,
            ratePrograms
        )
        const stateAnalystsEmails = getTestStateAnalystsEmails(
            unlockResult.stateCode
        )

        const cmsEmails = [
            ...config.devReviewTeamEmails,
            ...stateAnalystsEmails,
            ...config.oactEmails,
        ]

        // email subject line is correct for CMS email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was unlocked`),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyHTML: expect.stringContaining(rateName),
            })
        )
    })

    it('send email to CMS with analysts from db when unlocking submission succeeds', async () => {
        const ldService = testLDService({
            'read-write-state-assignments': true,
        })

        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer({
            store: postgresStore,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            emailer: mockEmailer,
            store: postgresStore,
            ldService,
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

        await updateTestStateAssignments(cmsServer, 'FL', assignedUserIDs)

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestContractWithRate(
            stateServer,
            {
                riskBasedContract: true,
            }
        )
        // Unlock
        const unlockResult = await unlockTestContract(
            cmsServer,
            stateSubmission.id,
            'Super duper good reason.'
        )

        const currentRevision = unlockResult.draftRevision

        const programs = [defaultFloridaProgram()]
        const ratePrograms = [defaultFloridaRateProgram()]
        const name = packageName(
            unlockResult.stateCode,
            unlockResult.stateNumber,
            currentRevision.formData.programIDs,
            programs
        )

        const firstRateFormData =
            unlockResult.draftRates[0].draftRevision?.formData
        if (!firstRateFormData) {
            throw new Error('should have a first rate with form data')
        }

        const convertedFirstRateFormData = nullsToUndefined(
            Object.assign({}, firstRateFormData)
        )

        const rateName = generateRateCertificationName(
            convertedFirstRateFormData,
            unlockResult.stateCode,
            ratePrograms
        )

        const cmsEmails = [
            ...config.devReviewTeamEmails,
            ...assignedUserEmails,
            ...config.oactEmails,
        ]

        // email subject line is correct for CMS email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was unlocked`),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyHTML: expect.stringContaining(rateName),
            })
        )
    })

    it('send email to State when unlocking submission succeeds', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer()
        const stateServerTwo = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    email: 'notspiderman@example.com',
                }),
            },
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            emailer: mockEmailer,
        })

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestContractWithRate(
            stateServer,
            {
                riskBasedContract: true,
            }
        )
        // Unlock
        const unlockResult = await unlockTestContract(
            cmsServer,
            stateSubmission.id,
            'Super duper good reason.'
        )

        await submitTestContract(
            stateServerTwo,
            unlockResult.id,
            'resubmitting from different user'
        )

        await unlockTestContract(
            cmsServer,
            stateSubmission.id,
            'For a second time.'
        )

        const currentRevision = unlockResult.draftRevision

        const programs = [defaultFloridaProgram()]
        const ratePrograms = [defaultFloridaRateProgram()]
        const name = packageName(
            unlockResult.stateCode,
            unlockResult.stateNumber,
            currentRevision.formData.programIDs,
            programs
        )

        const firstRateFormData =
            unlockResult.draftRates[0].draftRevision?.formData
        if (!firstRateFormData) {
            throw new Error('should have a first rate with form data')
        }

        const convertedFirstRateFormData = nullsToUndefined(
            Object.assign({}, firstRateFormData)
        )

        const rateName = generateRateCertificationName(
            convertedFirstRateFormData,
            unlockResult.stateCode,
            ratePrograms
        )

        const stateReceiverEmails = [
            'james@example.com',
            'notspiderman@example.com',
            ...currentRevision.formData.stateContacts.map(
                (contact) => contact.email
            ),
        ]
        // email subject line is correct for CMS email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was unlocked by CMS`),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(stateReceiverEmails)
                ),
                bodyHTML: expect.stringContaining(rateName),
            })
        )
    })
})
