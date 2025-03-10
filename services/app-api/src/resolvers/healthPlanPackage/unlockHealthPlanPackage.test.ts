import type { GraphQLError } from 'graphql'
import { UnlockHealthPlanPackageDocument } from '../../gen/gqlClient'
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
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { base64ToDomain } from '@mc-review/hpp'
import { generateRateName, packageName } from '@mc-review/hpp'
import type { HealthPlanFormDataType } from '@mc-review/hpp'
import {
    createDBUsersWithFullData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { fetchTestContract } from '../../testHelpers/gqlContractHelpers'
import {
    addNewRateToTestContract,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'

describe(`Tests unlockHealthPlanPackage`, () => {
    const cmsUser = testCMSUser()

    it('returns a HealthPlanPackage with all revisions', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Unlock
        const unlockResult = await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
        expect(unlockedSub.revisions[0].node.unlockInfo?.updatedBy.email).toBe(
            'zuko@example.com'
        )
        expect(unlockedSub.revisions[0].node.unlockInfo?.updatedReason).toBe(
            'Super duper good reason.'
        )
        expect(
            unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
        ).toContain(todaysDate())
        // check that the date has full ISO time eg. 2022-03-25T03:09:54.864Z
        expect(
            unlockedSub.revisions[0].node.unlockInfo?.updatedAt.toISOString()
        ).toContain('Z')
    }, 20000)

    it('returns a package that can be updated without errors', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Unlock
        const unlockResult = await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
        expect(unlockedSub.revisions[0].node.unlockInfo?.updatedBy.email).toBe(
            'zuko@example.com'
        )
        expect(unlockedSub.revisions[0].node.unlockInfo?.updatedReason).toBe(
            'Super duper good reason.'
        )
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

    // this test is currently failing for valid reasons
    it('allows for multiple edits, editing the set of revisions correctly', async () => {
        const stateServer = await constructTestPostgresServer()
        // First, create a new submitted submission // SUBMISSION 1
        const submittedOnce =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Unlock
        const unlockedOnce = await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
            variables: {
                input: {
                    pkgID: submittedOnce.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expect(unlockedOnce.errors).toBeUndefined()
        const unlockedSub = unlockedOnce?.data?.unlockHealthPlanPackage.pkg

        // After unlock, we should get a draft submission back
        expect(unlockedSub.status).toBe('UNLOCKED')
        expect(unlockedSub.revisions[0].node.unlockInfo).toBeDefined()
        expect(unlockedSub.revisions[0].node.unlockInfo?.updatedBy.email).toBe(
            'zuko@example.com'
        )
        expect(unlockedSub.revisions[0].node.unlockInfo?.updatedReason).toBe(
            'Super duper good reason.'
        )
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

        // update the rates
        // TODO: we can lose this fetchcontract once Contract API is done
        const contractData = await fetchTestContract(stateServer, formData.id)

        const oneRateAddedContract = await addNewRateToTestContract(
            stateServer,
            contractData,
            {
                rateDateStart: '2022-01-01',
                rateDateEnd: '2022-12-31',
                rateProgramIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
                rateType: 'NEW',
                rateDateCertified: '2022-01-02',
                rateDocuments: [
                    {
                        name: 'fake doc',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'fakesha',
                    },
                    {
                        name: 'fake doc 2',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'fakesha',
                    },
                    {
                        name: 'fake doc 3',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'fakesha',
                    },
                    {
                        name: 'fake doc 4',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                certifyingActuaryContacts: [
                    {
                        name: 'Enrico Soletzo 1',
                        titleRole: 'person',
                        email: 'en@example.com',
                        actuarialFirm: 'MERCER',
                    },
                ],
                addtlActuaryContacts: [
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
            }
        )

        await addNewRateToTestContract(stateServer, oneRateAddedContract, {
            rateDateStart: '2023-01-01',
            rateDateEnd: '2023-12-31',
            rateProgramIDs: ['08d114c2-0c01-4a1a-b8ff-e2b79336672d'],
            rateType: 'NEW',
            rateDateCertified: '2022-12-31',
            rateDocuments: [
                {
                    name: 'fake doc number two',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: 'fakesha',
                },
            ],
            supportingDocuments: [],
            certifyingActuaryContacts: [
                {
                    name: 'Enrico Soletzo',
                    titleRole: 'person',
                    email: 'en@example.com',
                    actuarialFirm: 'MERCER',
                },
            ],
        })

        // update the contract as well
        await updateTestHealthPlanFormData(stateServer, formData)

        const refetched = await fetchTestHealthPlanPackageById(
            stateServer,
            submittedOnce.id
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
            submittedOnce.id,
            'Test first resubmission reason'
        )

        const unlockedTwice = await unlockTestHealthPlanPackage(
            cmsServer,
            submittedOnce.id,
            'unlock to remove rate'
        )

        const unlockedFormData = latestFormData(unlockedTwice)
        const unlockedRateDocs = unlockedFormData.rateInfos.map(
            (r) => r.rateDocuments[0].name
        )
        expect(unlockedRateDocs).toEqual([
            'rateDocument.pdf',
            'fake doc',
            'fake doc number two',
        ])

        // remove the first rate
        const unlockedTwiceContractData = await fetchTestContract(
            stateServer,
            formData.id
        )
        const rateInputs = updateRatesInputFromDraftContract(
            unlockedTwiceContractData
        )

        rateInputs.updatedRates = rateInputs.updatedRates.slice(1)
        await updateTestDraftRatesOnContract(stateServer, rateInputs)

        const submittedThrice = await resubmitTestHealthPlanPackage(
            // SUBMISSION 3
            stateServer,
            submittedOnce.id,
            'Test second resubmission reason'
        )

        const finallySubmittedFormData = latestFormData(submittedThrice)

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
        expect(actuariesInOrder).toEqual(['Enrico Soletzo 1'])

        // checks additional actuaries in order
        const addtlActuariesInOrder =
            finallySubmittedFormData.rateInfos[0].addtlActuaryContacts?.map(
                (c) => c.name
            )
        expect(addtlActuariesInOrder).toEqual([
            'Enrico Soletzo 2',
            'Enrico Soletzo 3',
        ])

        const returnedRevisionIDs = submittedThrice.revisions.map(
            (r: HealthPlanRevisionEdge) => r.node.id
        )

        expect(returnedRevisionIDs).toHaveLength(3)

        const formDatas: HealthPlanFormDataType[] =
            submittedThrice.revisions.map((r: HealthPlanRevisionEdge) =>
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
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
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
        expect(draft.revisions[0].node.unlockInfo?.updatedBy.email).toBe(
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
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        // Unlock
        const unlockResult = await stateServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // First, create a new draft submission
        const stateSubmission =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        // Attempt Unlock Draft
        const unlockDraftResult = await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
            query: UnlockHealthPlanPackageDocument,
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
        })

        // First, create a new submitted submission
        // const stateSubmission = await createAndSubmitTestHealthPlanPackage(stateServer)

        // Unlock
        const unlockResult = await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
        expect(err.message).toBe('A package must exist to be unlocked: foo-bar')
    })

    it('returns errors if unlocked reason is undefined', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Attempt Unlock Draft
        const unlockedResult = await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
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
        await createDBUsersWithFullData([...assignedUsers, cmsUser])
        await updateTestStateAssignments(cmsServer, 'FL', assignedUserIDs)

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestHealthPlanPackage(
            stateServer,
            { riskBasedContract: true }
        )

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
        const rateName = generateRateName(sub, sub.rateInfos[0], ratePrograms)

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
        const stateServer = await constructTestPostgresServer()
        const stateServerTwo = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    email: 'notspiderman@example.com',
                }),
            },
        })

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
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
        const rateName = generateRateName(sub, sub.rateInfos[0], ratePrograms)

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
                subject: expect.stringContaining(`${name} was unlocked by CMS`),
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
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        // Unlock
        await cmsServer.executeOperation({
            query: UnlockHealthPlanPackageDocument,
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
})
