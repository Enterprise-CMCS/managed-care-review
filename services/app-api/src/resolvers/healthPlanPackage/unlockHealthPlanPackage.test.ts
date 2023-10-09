import type { GraphQLError } from 'graphql'
import UNLOCK_HEALTH_PLAN_PACKAGE from '../../../../app-graphql/src/mutations/unlockHealthPlanPackage.graphql'
import type {
    HealthPlanPackage,
    HealthPlanRevisionEdge,
} from '../../gen/gqlServer'
import { todaysDate } from '../../testHelpers/dateHelpers'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
    createAndSubmitTestHealthPlanPackage,
    defaultFloridaProgram,
    fetchTestHealthPlanPackageById,
    submitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanFormData,
    resubmitTestHealthPlanPackage,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { base64ToDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    generateRateName,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import {
    getTestStateAnalystsEmails,
    mockEmailParameterStoreError,
} from '../../testHelpers/parameterStoreHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import type {
    FeatureFlagLDConstant,
    FlagValue,
} from 'app-web/src/common-code/featureFlags'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

const flagValueTestParameters: {
    flagName: FeatureFlagLDConstant
    flagValue: FlagValue
    testName: string
}[] = [
    {
        flagName: 'rates-db-refactor',
        flagValue: false,
        testName: 'unlockHealthPlanPackage with all feature flags off',
    },
    {
        flagName: 'rates-db-refactor',
        flagValue: true,
        testName: 'unlockHealthPlanPackage with rates-db-refactor on',
    },
]

describe.each(flagValueTestParameters)(
    `Tests $testName`,
    ({ flagName, flagValue }) => {
        const cmsUser = testCMSUser()
        const mockLDService = testLDService({ [flagName]: flagValue })

        it('returns a HealthPlanPackage with all revisions', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // Unlock
            const unlockResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockResult.errors).toBeUndefined()

            if (!unlockResult?.data) {
                throw new Error('this should never happen')
            }

            const unlockedSub: HealthPlanPackage =
                unlockResult.data.unlockHealthPlanPackage.pkg

            // After unlock, we should get a draft submission back
            expect(unlockedSub.status).toBe('UNLOCKED')

            expect(unlockedSub.revisions).toHaveLength(2)

            expect(unlockedSub.revisions[0].node.submitInfo).toBeNull()
            expect(unlockedSub.revisions[1].node.submitInfo).toBeDefined()
            expect(
                unlockedSub.revisions[1].node.submitInfo?.updatedAt.toISOString()
            ).toContain(todaysDate())
            // check that the date has full ISO time eg. 2022-03-25T03:09:54.864Z
            expect(
                unlockedSub.revisions[1].node.submitInfo?.updatedAt.toISOString()
            ).toContain('Z')

            expect(unlockedSub.revisions[0].node.unlockInfo).toBeDefined()
            expect(unlockedSub.revisions[0].node.unlockInfo?.updatedBy).toBe(
                'zuko@example.com'
            )
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedReason
            ).toBe('Super duper good reason.')
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain(todaysDate())
            // check that the date has full ISO time eg. 2022-03-25T03:09:54.864Z
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain('Z')
        }, 20000)

        it('returns a package that can be updated without errors', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // Unlock
            const unlockResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockResult.errors).toBeUndefined()
            const unlockedSub = unlockResult?.data?.unlockHealthPlanPackage.pkg

            // After unlock, we should get a draft submission back
            expect(unlockedSub.status).toBe('UNLOCKED')
            expect(unlockedSub.revisions[0].node.unlockInfo).toBeDefined()
            expect(unlockedSub.revisions[0].node.unlockInfo?.updatedBy).toBe(
                'zuko@example.com'
            )
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedReason
            ).toBe('Super duper good reason.')
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain(todaysDate())
            // check that the date has full ISO time eg. 2022-03-25T03:09:54.864Z
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain('Z')

            const formData = latestFormData(unlockedSub)

            // after unlock we should be able to update that draft submission and get the results
            formData.programIDs = [defaultFloridaProgram().id]
            formData.submissionType = 'CONTRACT_AND_RATES' as const
            formData.submissionDescription = 'UPDATED_AFTER_UNLOCK'
            formData.documents = []
            formData.contractType = 'BASE' as const
            formData.contractDocuments = []
            formData.managedCareEntities = ['MCO']
            formData.federalAuthorities = ['VOLUNTARY' as const]
            formData.stateContacts = []
            formData.addtlActuaryContacts = []

            await updateTestHealthPlanFormData(stateServer, formData)

            const refetched = await fetchTestHealthPlanPackageById(
                stateServer,
                stateSubmission.id
            )

            const refetchedFormData = latestFormData(refetched)

            expect(refetchedFormData.submissionDescription).toBe(
                'UPDATED_AFTER_UNLOCK'
            )
        }, 20000)

        it('allows for multiple edits, editing the set of revisions correctly', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            // First, create a new submitted submission // SUBMISSION 1
            const stateDraft = await createAndSubmitTestHealthPlanPackage(
                stateServer
                // unlockedWithFullRates(),
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // Unlock
            const unlockResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateDraft.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockResult.errors).toBeUndefined()
            const unlockedSub = unlockResult?.data?.unlockHealthPlanPackage.pkg

            // After unlock, we should get a draft submission back
            expect(unlockedSub.status).toBe('UNLOCKED')
            expect(unlockedSub.revisions[0].node.unlockInfo).toBeDefined()
            expect(unlockedSub.revisions[0].node.unlockInfo?.updatedBy).toBe(
                'zuko@example.com'
            )
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedReason
            ).toBe('Super duper good reason.')
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain(todaysDate())
            // check that the date has full ISO time eg. 2022-03-25T03:09:54.864Z
            expect(
                unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain('Z')

            const formData = latestFormData(unlockedSub)

            // after unlock we should be able to update that draft submission and get the results
            formData.submissionDescription = 'UPDATED_AFTER_UNLOCK'

            formData.rateInfos.push(
                {
                    rateDateStart: new Date(),
                    rateDateEnd: new Date(),
                    rateProgramIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
                    rateType: 'NEW',
                    rateDateCertified: new Date(),
                    rateDocuments: [
                        {
                            name: 'fake doc',
                            s3URL: 'foo://bar',
                            sha256: 'fakesha',
                            documentCategories: ['RATES'],
                        },
                        {
                            name: 'fake doc 2',
                            s3URL: 'foo://bar',
                            sha256: 'fakesha',
                            documentCategories: ['RATES'],
                        },
                        {
                            name: 'fake doc 3',
                            s3URL: 'foo://bar',
                            sha256: 'fakesha',
                            documentCategories: ['RATES'],
                        },
                        {
                            name: 'fake doc 4',
                            s3URL: 'foo://bar',
                            sha256: 'fakesha',
                            documentCategories: ['RATES'],
                        },
                    ],
                    supportingDocuments: [],
                    actuaryContacts: [
                        {
                            name: 'Enrico Soletzo 1',
                            titleRole: 'person',
                            email: 'en@example.com',
                            actuarialFirm: 'MERCER',
                        },
                        {
                            name: 'Enrico Soletzo 2',
                            titleRole: 'person',
                            email: 'en@example.com',
                            actuarialFirm: 'MERCER',
                        },
                        {
                            name: 'Enrico Soletzo 3',
                            titleRole: 'person',
                            email: 'en@example.com',
                            actuarialFirm: 'MERCER',
                        },
                    ],
                },
                {
                    rateDateStart: new Date(),
                    rateDateEnd: new Date(),
                    rateProgramIDs: ['08d114c2-0c01-4a1a-b8ff-e2b79336672d'],
                    rateType: 'NEW',
                    rateDateCertified: new Date(),
                    rateDocuments: [
                        {
                            name: 'fake doc number two',
                            s3URL: 'foo://bar',
                            sha256: 'fakesha',
                            documentCategories: ['RATES'],
                        },
                    ],
                    supportingDocuments: [],
                    actuaryContacts: [
                        {
                            name: 'Enrico Soletzo',
                            titleRole: 'person',
                            email: 'en@example.com',
                            actuarialFirm: 'MERCER',
                        },
                    ],
                }
            )

            await updateTestHealthPlanFormData(stateServer, formData)

            const refetched = await fetchTestHealthPlanPackageById(
                stateServer,
                stateDraft.id
            )

            const refetchedFormData = latestFormData(refetched)

            expect(refetchedFormData.submissionDescription).toBe(
                'UPDATED_AFTER_UNLOCK'
            )

            expect(refetchedFormData.rateInfos).toHaveLength(3)

            const rateDocs = refetchedFormData.rateInfos.map(
                (r) => r.rateDocuments[0].name
            )
            expect(rateDocs).toEqual([
                'rateDocument.pdf',
                'fake doc',
                'fake doc number two',
            ])

            await resubmitTestHealthPlanPackage(
                // SUBMISSION 2
                stateServer,
                stateDraft.id,
                'Test first resubmission reason'
            )

            const unlockedPKG = await unlockTestHealthPlanPackage(
                cmsServer,
                stateDraft.id,
                'unlock to remove rate'
            )

            const unlockedFormData = latestFormData(unlockedPKG)
            const unlockedRateDocs = unlockedFormData.rateInfos.map(
                (r) => r.rateDocuments[0].name
            )
            expect(unlockedRateDocs).toEqual([
                'rateDocument.pdf',
                'fake doc',
                'fake doc number two',
            ])

            // remove the first rate
            unlockedFormData.rateInfos = unlockedFormData.rateInfos.slice(1)

            await updateTestHealthPlanFormData(stateServer, unlockedFormData)

            const finallySubmittedPKG = await resubmitTestHealthPlanPackage(
                // SUBMISSION 3
                stateServer,
                stateDraft.id,
                'Test second resubmission reason'
            )

            const finallySubmittedFormData = latestFormData(finallySubmittedPKG)

            expect(finallySubmittedFormData.rateInfos).toHaveLength(2)
            const finalRateDocs = finallySubmittedFormData.rateInfos.map(
                (r) => r.rateDocuments[0].name
            )
            expect(finalRateDocs).toEqual(['fake doc', 'fake doc number two'])

            // check document order
            const docsInOrder =
                finallySubmittedFormData.rateInfos[0].rateDocuments.map(
                    (d) => d.name
                )
            expect(docsInOrder).toEqual([
                'fake doc',
                'fake doc 2',
                'fake doc 3',
                'fake doc 4',
            ])

            // check contacts order
            const actuariesInOrder =
                finallySubmittedFormData.rateInfos[0].actuaryContacts.map(
                    (c) => c.name
                )
            expect(actuariesInOrder).toEqual([
                'Enrico Soletzo 1',
                'Enrico Soletzo 2',
                'Enrico Soletzo 3',
            ])

            // check the history makes sense.
            const formDatas: HealthPlanFormDataType[] =
                finallySubmittedPKG.revisions.map((r: HealthPlanRevisionEdge) =>
                    base64ToDomain(r.node.formDataProto)
                )

            expect(formDatas).toHaveLength(3)

            // expect(formDatas[0].rateInfos).toHaveLength(2)
            // expect(formDatas[1].rateInfos).toHaveLength(3)
            // expect(formDatas[2].rateInfos).toHaveLength(1)

            // TODO: The below section tests rate revision history, enable this when that feature is reimplemented
            // if (flagValue) {
            //     // POST REFACTOR. also assert that the correct Rate table entries have been created.
            //     const prismaClient = await sharedTestPrismaClient()
            //
            //     const rates = []
            //     const rateIDs = new Set<string>()
            //     for (const formData of formDatas) {
            //         for (const rateInfo of formData.rateInfos) {
            //             rateIDs.add(rateInfo.id!)
            //         }
            //     }
            //
            //     expect(formDatas).toHaveLength(6)
            //
            //     expect(rateIDs.size).toBe(3)
            //
            //     for (const rateID of rateIDs.values()) {
            //
            //         const rateTable = await prismaClient.rateTable.findFirstOrThrow({
            //             where: {
            //                 id: rateID
            //             },
            //             include: {
            //                 revisions: true,
            //             },
            //         })
            //         rates.push(rateTable)
            //     }
            //
            //     rates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            //
            //     expect(rates[0].revisions).toHaveLength(3) // this first rate was unlocked twice so should have 3 revisions even though only 2 of them end up associated with our contract.
            //     expect(rates[1].revisions).toHaveLength(2)
            //     expect(rates[2].revisions).toHaveLength(2)
            //
            // }
            // throw new Error('Not done with this test yet')
        }, 20000)

        it('can be unlocked repeatedly', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Super duper good reason.'
            )

            await resubmitTestHealthPlanPackage(
                stateServer,
                stateSubmission.id,
                'Test second resubmission reason'
            )

            await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Super duper duper good reason.'
            )

            await resubmitTestHealthPlanPackage(
                stateServer,
                stateSubmission.id,
                'Test second resubmission reason'
            )

            const draft = await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Very super duper good reason.'
            )
            expect(draft.status).toBe('UNLOCKED')
            expect(draft.revisions[0].node.unlockInfo?.updatedBy).toBe(
                'zuko@example.com'
            )
            expect(draft.revisions[0].node.unlockInfo?.updatedReason).toBe(
                'Very super duper good reason.'
            )
            expect(
                draft.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain(todaysDate())
            // check that the date has full ISO time eg. 2022-03-25T03:09:54.864Z
            expect(
                draft.revisions[0].node.unlockInfo?.updatedAt.toISOString()
            ).toContain('Z')
        }, 20000)

        it.todo(
            'returns package where previously linked documents and contacts can be deleted without breaking old revisions'
        ) // this can be completed after unlock - want to create, submit, unlock, then re-edit

        it('returns errors if a state user tries to unlock', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            // Unlock
            const unlockResult = await stateServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockResult.errors).toBeDefined()
            const err = (unlockResult.errors as GraphQLError[])[0]

            expect(err.extensions['code']).toBe('FORBIDDEN')
            expect(err.message).toBe('user not authorized to unlock package')
        })

        it('returns errors if trying to unlock package with wrong package status', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // First, create a new draft submission
            const stateSubmission = await createAndUpdateTestHealthPlanPackage(
                stateServer
            )

            // Attempt Unlock Draft
            const unlockDraftResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockDraftResult.errors).toBeDefined()
            const err = (unlockDraftResult.errors as GraphQLError[])[0]

            expect(err.extensions).toEqual(
                expect.objectContaining({
                    code: 'BAD_USER_INPUT',
                    cause: 'INVALID_PACKAGE_STATUS',
                    argumentName: 'pkgID',
                })
            )
            expect(err.message).toBe(
                'Attempted to unlock package with wrong status'
            )

            await submitTestHealthPlanPackage(stateServer, stateSubmission.id)

            // Unlock Submission
            await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Super duper good reason.'
            )

            // Attempt Unlock Unlocked
            const unlockUnlockedResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockUnlockedResult.errors).toBeDefined()
            const unlockErr = (unlockUnlockedResult.errors as GraphQLError[])[0]

            expect(unlockErr.extensions).toEqual(
                expect.objectContaining({
                    code: 'BAD_USER_INPUT',
                    cause: 'INVALID_PACKAGE_STATUS',
                    argumentName: 'pkgID',
                })
            )
            expect(unlockErr.message).toBe(
                'Attempted to unlock package with wrong status'
            )
        })

        it('returns an error if the submission does not exit', async () => {
            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            // const stateSubmission = await createAndSubmitTestHealthPlanPackage(stateServer)

            // Unlock
            const unlockResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: 'foo-bar',
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockResult.errors).toBeDefined()
            const err = (unlockResult.errors as GraphQLError[])[0]

            expect(err.extensions['code']).toBe('BAD_USER_INPUT')
            expect(err.message).toBe(
                'A package must exist to be unlocked: foo-bar'
            )
        })

        it('returns an error if the DB errors', async () => {
            const errorStore = mockStoreThatErrors()

            const cmsServer = await constructTestPostgresServer({
                store: errorStore,
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // Unlock
            const unlockResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: 'foo-bar',
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(unlockResult.errors).toBeDefined()
            const err = (unlockResult.errors as GraphQLError[])[0]

            expect(err.extensions['code']).toBe('INTERNAL_SERVER_ERROR')
            expect(err.message).toContain(
                'error came from the generic store with errors mock'
            )
        })

        it('returns errors if unlocked reason is undefined', async () => {
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            // Attempt Unlock Draft
            const unlockedResult = await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: undefined,
                    },
                },
            })

            expect(unlockedResult.errors).toBeDefined()
            const err = (unlockedResult.errors as GraphQLError[])[0]

            expect(err.extensions['code']).toBe('BAD_USER_INPUT')
            expect(err.message).toContain(
                'Field "unlockedReason" of required type "String!" was not provided.'
            )
        })

        it('send email to CMS when unlocking submission succeeds', async () => {
            const config = testEmailConfig()
            const mockEmailer = testEmailer(config)
            //mock invoke email submit lambda
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
                emailer: mockEmailer,
            })

            // Unlock
            const unlockResult = await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Super duper good reason.'
            )

            const currentRevision = unlockResult.revisions[0].node.formDataProto

            const sub = base64ToDomain(currentRevision)
            if (sub instanceof Error) {
                throw sub
            }

            const programs = [defaultFloridaProgram()]
            const ratePrograms = [defaultFloridaRateProgram()]
            const name = packageName(
                sub.stateCode,
                sub.stateNumber,
                sub.programIDs,
                programs
            )
            const rateName = generateRateName(
                sub,
                sub.rateInfos[0],
                ratePrograms
            )
            const stateAnalystsEmails = getTestStateAnalystsEmails(
                sub.stateCode
            )

            const cmsEmails = [
                ...config.devReviewTeamEmails,
                ...stateAnalystsEmails,
                ...config.oactEmails,
            ]

            // email subject line is correct for CMS email
            expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining(`${name} was unlocked`),
                    sourceEmail: config.emailSource,
                    toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                    bodyHTML: expect.stringContaining(rateName),
                })
            )
        })

        it('send state email to state contacts and all submitters when unlocking submission succeeds', async () => {
            const config = testEmailConfig()
            const mockEmailer = testEmailer(config)
            //mock invoke email submit lambda
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const stateServerTwo = await constructTestPostgresServer({
                context: {
                    user: testStateUser({
                        email: 'notspiderman@example.com',
                    }),
                },
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
                emailer: mockEmailer,
            })

            // First unlock
            await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Super duper good reason.'
            )

            // Resubmission to get multiple submitters
            await resubmitTestHealthPlanPackage(
                stateServerTwo,
                stateSubmission.id,
                'Test resubmission reason'
            )

            // Final unlock to test against
            const unlockResult = await unlockTestHealthPlanPackage(
                cmsServer,
                stateSubmission.id,
                'Super duper good reason.'
            )

            const currentRevision = unlockResult.revisions[0].node.formDataProto

            const sub = base64ToDomain(currentRevision)
            if (sub instanceof Error) {
                throw sub
            }

            const programs = [defaultFloridaProgram()]
            const ratePrograms = [defaultFloridaRateProgram()]
            const name = packageName(
                sub.stateCode,
                sub.stateNumber,
                sub.programIDs,
                programs
            )
            const rateName = generateRateName(
                sub,
                sub.rateInfos[0],
                ratePrograms
            )

            const stateReceiverEmails = [
                'james@example.com',
                'notspiderman@example.com',
                ...sub.stateContacts.map((contact) => contact.email),
            ]

            // email subject line is correct for CMS email.
            // Mock emailer is called 4 times, 2 for the first unlock, 2 for the second unlock.
            // From the pair of emails, the second one is the state email.
            expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
                4,
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `${name} was unlocked by CMS`
                    ),
                    sourceEmail: config.emailSource,
                    toAddresses: expect.arrayContaining(
                        Array.from(stateReceiverEmails)
                    ),
                    bodyHTML: expect.stringContaining(rateName),
                })
            )
        })

        it('does send unlock email when request for state analysts emails fails', async () => {
            const config = testEmailConfig()
            const mockEmailer = testEmailer(config)
            //mock invoke email submit lambda
            const mockEmailParameterStore = mockEmailParameterStoreError()
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            // First, create a new submitted submission
            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
                emailer: mockEmailer,
                emailParameterStore: mockEmailParameterStore,
            })

            // Unlock
            await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
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

        it('does log error when request for state specific analysts emails failed', async () => {
            const mockEmailParameterStore = mockEmailParameterStoreError()
            const consoleErrorSpy = jest.spyOn(console, 'error')
            const stateServer = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const error = {
                error: 'No store found',
                message: 'getStateAnalystsEmails failed',
                operation: 'getStateAnalystsEmails',
                status: 'ERROR',
            }

            const stateSubmission = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
                emailParameterStore: mockEmailParameterStore,
            })

            await cmsServer.executeOperation({
                query: UNLOCK_HEALTH_PLAN_PACKAGE,
                variables: {
                    input: {
                        pkgID: stateSubmission.id,
                        unlockedReason: 'Super duper good reason.',
                    },
                },
            })

            expect(consoleErrorSpy).toHaveBeenCalledWith(error)
        })
    }
)
