import {
    constructTestPostgresServer,
    defaultFloridaProgram,
    defaultFloridaRateProgram,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
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
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { addNewRateToTestContract } from '../../testHelpers/gqlRateHelpers'
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
        }
    )

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
