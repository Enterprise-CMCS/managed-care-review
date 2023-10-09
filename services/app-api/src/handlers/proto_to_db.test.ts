import { todaysDate } from '../testHelpers/dateHelpers'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    defaultFloridaProgram,
    fetchTestHealthPlanPackageById,
    resubmitTestHealthPlanPackage,
    submitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanFormData,
} from '../testHelpers/gqlHelpers'
import { latestFormData } from '../testHelpers/healthPlanPackageHelpers'
import { testLDService } from '../testHelpers/launchDarklyHelpers'
import { testCMSUser } from '../testHelpers/userHelpers'
import UNLOCK_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/unlockHealthPlanPackage.graphql'
import {
    cleanupPreviousProtoMigrate,
    decodeFormDataProto,
    migrateRevision,
} from './proto_to_db'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { findAllRevisions } from '../postgres/healthPlanPackage'
import { isStoreError } from '../postgres'
import {
    base64ToDomain,
    toProtoBuffer,
} from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import assert from 'assert'
import { packageName } from '../../../app-web/src/common-code/healthPlanFormDataType'
import type {
    HealthPlanFormDataType,
    LockedHealthPlanFormDataType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'

describe('test that we migrate things', () => {
    const mockPreRefactorLDService = testLDService({
        'rates-db-refactor': false,
    })
    const mockPostRefactorLDService = testLDService({
        'rates-db-refactor': true,
    })

    const cmsUser = testCMSUser()

    it('allows for multiple edits, editing the set of revisions correctly', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockPreRefactorLDService,
        })

        // First, create a new submitted submission
        const stateDraft = await createAndSubmitTestHealthPlanPackage(
            stateServer
            // unlockedWithFullRates(),
        )

        const cmsServer = await constructTestPostgresServer({
            ldService: mockPreRefactorLDService,
            context: {
                user: cmsUser,
            },
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
                        documentCategories: ['RATES'],
                        sha256: 'fakesha',
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
            },
            {
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateProgramIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
                rateType: 'NEW',
                rateDateCertified: new Date(),
                rateDocuments: [
                    {
                        name: 'fake doc number two',
                        s3URL: 'foo://bar/two',
                        documentCategories: ['RATES'],
                        sha256: 'fakesha',
                    },
                    {
                        name: 'fake doc number three',
                        s3URL: 'foo://bar/three',
                        documentCategories: ['RATES'],
                        sha256: 'fakesha',
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

        // remove the first rate
        unlockedFormData.submissionDescription = 'FINAL_DESCRIPTION'
        unlockedFormData.rateInfos = unlockedFormData.rateInfos.slice(1)

        await updateTestHealthPlanFormData(stateServer, unlockedFormData)

        const finallySubmittedPKG = await resubmitTestHealthPlanPackage(
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

        // Now that we have a fully submitted package, we run the proto migrator on it
        const prismaClient = await sharedTestPrismaClient()

        // first reset us to the pre-proto migration tables state
        const cleanResult = await cleanupPreviousProtoMigrate(prismaClient)
        if (cleanResult instanceof Error) {
            const error = new Error(
                `Could not reset the DB: ${cleanResult.message}`
            )
            throw error
        }

        // look up the HPP using prisma methods. The migrator relies on finding all the
        // revisions in the DB and uses the Prisma type.
        const allRevisions = await findAllRevisions(prismaClient)
        if (isStoreError(allRevisions)) {
            const error = new Error(
                `Could not fetch revisions from DB: ${allRevisions.message}`
            )
            throw error
        }

        // for our test we just want the test data we made above to make expects on, not
        // absolutely everything in the local DB
        const revisionsToMigrate = []
        for (const revision of allRevisions) {
            const formData = decodeFormDataProto(revision)
            if (formData instanceof Error) {
                const error = new Error(
                    `Could not decode form data from revision in test: ${formData.message}`
                )
                throw error
            }
            if (formData.id === finallySubmittedPKG.id) {
                revisionsToMigrate.push(revision)
            }
        }

        const migratedContracts = []
        for (const revision of revisionsToMigrate) {
            const migratedRevision = await migrateRevision(
                prismaClient,
                revision
            )
            if (migratedRevision instanceof Error) {
                const error = new Error(
                    `Could not get a migrated revision back: ${migratedRevision}`
                )
                console.error(error)
                throw error
            }
            migratedContracts.push(migratedRevision)
        }

        const stateServerPost = await constructTestPostgresServer({
            ldService: mockPostRefactorLDService,
        })

        // let's fetch the HPP from the new contract and revision tables
        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            finallySubmittedPKG.id
        )

        // check HPP post refactor to HPP pre refactor
        // finallySubmittedPKG is what came back from the last submission
        // fetchedHPP is what came back from fetchHPP with the rate refactor flag on
        expect(finallySubmittedPKG.revisions).toHaveLength(
            fetchedHPP.revisions.length
        )

        const preFDS: HealthPlanFormDataType[] = []
        const postFDS: HealthPlanFormDataType[] = []
        for (let i = 0; i < finallySubmittedPKG.revisions.length; i++) {
            const preRev = finallySubmittedPKG.revisions[i].node
            const postRev = fetchedHPP.revisions[i].node

            const preFD = base64ToDomain(preRev.formDataProto)
            const postFD = base64ToDomain(postRev.formDataProto)

            if (preFD instanceof Error || postFD instanceof Error) {
                throw new Error('Got an error decoding')
            }

            preFDS.push(preFD)
            postFDS.push(postFD)
        }

        console.info(
            'COMPARE ORDER',
            preFDS.map((fd) => [fd.submissionDescription, fd.createdAt]),
            postFDS.map((fd) => [fd.submissionDescription, fd.createdAt])
        )

        for (let i = 0; i < finallySubmittedPKG.revisions.length; i++) {
            const preFD = preFDS[i]
            const postFD = postFDS[i]

            // deepStrictEqual args: actual comes first then expected
            assert.deepStrictEqual(postFD, preFD, 'form data not equal')
        }
    }, 20000)

    it('sets submitted at at correctly.', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockPreRefactorLDService,
        })

        // First, create a new submitted submission
        const stateDraft = await createAndSubmitTestHealthPlanPackage(
            stateServer
            // unlockedWithFullRates(),
        )

        const prismaClient = await sharedTestPrismaClient()

        // Modify submitted at on the first revision to not equal the most recent updatedAt date.
        // First in the proto
        const oldRevFD = latestFormData(
            stateDraft
        ) as LockedHealthPlanFormDataType
        oldRevFD.submittedAt = new Date(2023, 0, 1)
        const newFD = Buffer.from(toProtoBuffer(oldRevFD))

        // now in the submit info.
        await prismaClient.healthPlanRevisionTable.update({
            where: { id: stateDraft.revisions[0].node.id },
            data: {
                submittedAt: new Date(2023, 0, 1),
                formDataProto: newFD,
            },
        })

        // Now, run the migrator
        // first reset us to the pre-proto migration tables state
        const cleanResult = await cleanupPreviousProtoMigrate(prismaClient)
        if (cleanResult instanceof Error) {
            const error = new Error(
                `Could not reset the DB: ${cleanResult.message}`
            )
            throw error
        }

        // look up the HPP using prisma methods. The migrator relies on finding all the
        // revisions in the DB and uses the Prisma type.
        const allRevisions = await findAllRevisions(prismaClient)
        if (isStoreError(allRevisions)) {
            const error = new Error(
                `Could not fetch revisions from DB: ${allRevisions.message}`
            )
            throw error
        }

        // for our test we just want the test data we made above to make expects on, not
        // absolutely everything in the local DB
        const revisionsToMigrate = []
        for (const revision of allRevisions) {
            const formData = decodeFormDataProto(revision)
            if (formData instanceof Error) {
                const error = new Error(
                    `Could not decode form data from revision in test: ${formData.message}`
                )
                throw error
            }
            if (formData.id === stateDraft.id) {
                revisionsToMigrate.push(revision)
            }
        }

        const migratedContracts = []
        for (const revision of revisionsToMigrate) {
            const migratedRevision = await migrateRevision(
                prismaClient,
                revision
            )
            if (migratedRevision instanceof Error) {
                const error = new Error(
                    `Could not get a migrated revision back: ${migratedRevision}`
                )
                console.error(error)
                throw error
            }
            migratedContracts.push(migratedRevision)
        }

        // Now compare new to old.
        const oldHPP = await fetchTestHealthPlanPackageById(
            stateServer,
            stateDraft.id
        )

        const stateServerPost = await constructTestPostgresServer({
            ldService: mockPostRefactorLDService,
        })

        // let's fetch the HPP from the new contract and revision tables
        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            stateDraft.id
        )

        expect(fetchedHPP.initiallySubmittedAt).toEqual(
            oldHPP.initiallySubmittedAt
        )
        expect(fetchedHPP.revisions[0].node.submitInfo?.updatedAt).toEqual(
            oldHPP.revisions[0].node.submitInfo?.updatedAt
        )

        // check HPP post refactor to HPP pre refactor
        // finallySubmittedPKG is what came back from the last submission
        // fetchedHPP is what came back from fetchHPP with the rate refactor flag on
        expect(oldHPP.revisions).toHaveLength(fetchedHPP.revisions.length)

        const preFDS: HealthPlanFormDataType[] = []
        const postFDS: HealthPlanFormDataType[] = []
        for (let i = 0; i < oldHPP.revisions.length; i++) {
            const preRev = oldHPP.revisions[i].node
            const postRev = fetchedHPP.revisions[i].node

            const preFD = base64ToDomain(preRev.formDataProto)
            const postFD = base64ToDomain(postRev.formDataProto)

            if (preFD instanceof Error || postFD instanceof Error) {
                throw new Error('Got an error decoding')
            }

            preFDS.push(preFD)
            postFDS.push(postFD)
        }

        console.info(
            'COMPARE ORDER',
            preFDS.map((fd) => [fd.submissionDescription, fd.createdAt]),
            postFDS.map((fd) => [fd.submissionDescription, fd.createdAt])
        )

        for (let i = 0; i < oldHPP.revisions.length; i++) {
            const preFD = preFDS[i]
            const postFD = postFDS[i]

            // deepStrictEqual args: actual comes first then expected
            assert.deepStrictEqual(postFD, preFD, 'form data not equal')
        }
    }, 20000)

    it('sets unlocked at correctly.', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockPreRefactorLDService,
        })

        // First, create a new submitted submission
        const stateDraft = await createAndSubmitTestHealthPlanPackage(
            stateServer
            // unlockedWithFullRates(),
        )

        const cmsServer = await constructTestPostgresServer({
            ldService: mockPreRefactorLDService,
            context: {
                user: cmsUser,
            },
        })

        // Unlock
        await unlockTestHealthPlanPackage(
            cmsServer,
            stateDraft.id,
            'Super duper good reason.'
        )

        const prismaClient = await sharedTestPrismaClient()

        // Now, run the migrator
        // first reset us to the pre-proto migration tables state
        const cleanResult = await cleanupPreviousProtoMigrate(prismaClient)
        if (cleanResult instanceof Error) {
            const error = new Error(
                `Could not reset the DB: ${cleanResult.message}`
            )
            throw error
        }

        // look up the HPP using prisma methods. The migrator relies on finding all the
        // revisions in the DB and uses the Prisma type.
        const allRevisions = await findAllRevisions(prismaClient)
        if (isStoreError(allRevisions)) {
            const error = new Error(
                `Could not fetch revisions from DB: ${allRevisions.message}`
            )
            throw error
        }

        // for our test we just want the test data we made above to make expects on, not
        // absolutely everything in the local DB
        const revisionsToMigrate = []
        for (const revision of allRevisions) {
            const formData = decodeFormDataProto(revision)
            if (formData instanceof Error) {
                const error = new Error(
                    `Could not decode form data from revision in test: ${formData.message}`
                )
                throw error
            }
            if (formData.id === stateDraft.id) {
                revisionsToMigrate.push(revision)
            }
        }

        const migratedContracts = []
        for (const revision of revisionsToMigrate) {
            const migratedRevision = await migrateRevision(
                prismaClient,
                revision
            )
            if (migratedRevision instanceof Error) {
                const error = new Error(
                    `Could not get a migrated revision back: ${migratedRevision}`
                )
                console.error(error)
                throw error
            }
            migratedContracts.push(migratedRevision)
        }

        // Now compare new to old.
        const oldHPP = await fetchTestHealthPlanPackageById(
            stateServer,
            stateDraft.id
        )

        const stateServerPost = await constructTestPostgresServer({
            ldService: mockPostRefactorLDService,
        })

        // let's fetch the HPP from the new contract and revision tables
        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            stateDraft.id
        )

        expect(fetchedHPP.initiallySubmittedAt).toEqual(
            oldHPP.initiallySubmittedAt
        )
        expect(fetchedHPP.revisions[0].node.unlockInfo?.updatedAt).toEqual(
            oldHPP.revisions[0].node.unlockInfo?.updatedAt
        )

        // check HPP post refactor to HPP pre refactor
        // finallySubmittedPKG is what came back from the last submission
        // fetchedHPP is what came back from fetchHPP with the rate refactor flag on
        expect(oldHPP.revisions).toHaveLength(fetchedHPP.revisions.length)

        const preFDS: HealthPlanFormDataType[] = []
        const postFDS: HealthPlanFormDataType[] = []
        for (let i = 0; i < oldHPP.revisions.length; i++) {
            const preRev = oldHPP.revisions[i].node
            const postRev = fetchedHPP.revisions[i].node

            const preFD = base64ToDomain(preRev.formDataProto)
            const postFD = base64ToDomain(postRev.formDataProto)

            if (preFD instanceof Error || postFD instanceof Error) {
                throw new Error('Got an error decoding')
            }

            preFDS.push(preFD)
            postFDS.push(postFD)
        }

        console.info(
            'COMPARE ORDER',
            preFDS.map((fd) => [fd.submissionDescription, fd.createdAt]),
            postFDS.map((fd) => [fd.submissionDescription, fd.createdAt])
        )

        for (let i = 0; i < oldHPP.revisions.length; i++) {
            const preFD = preFDS[i]
            const postFD = postFDS[i]

            // who cares about updated at.
            preFD.updatedAt = new Date()
            postFD.updatedAt = preFD.updatedAt

            // deepStrictEqual args: actual comes first then expected
            assert.deepStrictEqual(postFD, preFD, 'form data not equal')
        }
    }, 20000)

    it('deals with related rates correctly.', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockPreRefactorLDService,
        })

        // First, create a new submitted submission
        const stateDraft = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const stateFD = latestFormData(stateDraft)

        const draftWithRelatedRate = await createAndUpdateTestHealthPlanPackage(
            stateServer
        )

        const draftRate = latestFormData(draftWithRelatedRate)
        draftRate.submissionDescription = 'This has a Related Rate'
        draftRate.rateInfos[0].packagesWithSharedRateCerts = [
            {
                packageId: stateDraft.id,
                packageName: packageName(
                    stateDraft.stateCode,
                    stateFD.stateNumber,
                    stateFD.programIDs,
                    [defaultFloridaProgram()]
                ),
            },
        ]

        await updateTestHealthPlanFormData(stateServer, draftRate)

        await submitTestHealthPlanPackage(stateServer, draftWithRelatedRate.id)

        const prismaClient = await sharedTestPrismaClient()
        // Now, run the migrator
        // first reset us to the pre-proto migration tables state
        const cleanResult = await cleanupPreviousProtoMigrate(prismaClient)
        if (cleanResult instanceof Error) {
            const error = new Error(
                `Could not reset the DB: ${cleanResult.message}`
            )
            throw error
        }

        // look up the HPP using prisma methods. The migrator relies on finding all the
        // revisions in the DB and uses the Prisma type.
        const allRevisions = await findAllRevisions(prismaClient)
        if (isStoreError(allRevisions)) {
            const error = new Error(
                `Could not fetch revisions from DB: ${allRevisions.message}`
            )
            throw error
        }

        // for our test we just want the test data we made above to make expects on, not
        // absolutely everything in the local DB
        const revisionsToMigrate = []
        for (const revision of allRevisions) {
            const formData = decodeFormDataProto(revision)
            if (formData instanceof Error) {
                const error = new Error(
                    `Could not decode form data from revision in test: ${formData.message}`
                )
                throw error
            }
            if (
                formData.id === stateDraft.id ||
                formData.id === draftWithRelatedRate.id
            ) {
                revisionsToMigrate.push(revision)
            }
        }

        const migratedContracts = []
        for (const revisionToMig of revisionsToMigrate) {
            const migratedRevision = await migrateRevision(
                prismaClient,
                revisionToMig
            )
            if (migratedRevision instanceof Error) {
                const error = new Error(
                    `Could not get a migrated revision back: ${migratedRevision}`
                )
                console.error(error)
                throw error
            }
            migratedContracts.push(migratedRevision)
        }

        // Now compare new to old.
        const oldHPP = await fetchTestHealthPlanPackageById(
            stateServer,
            draftWithRelatedRate.id
        )

        const stateServerPost = await constructTestPostgresServer({
            ldService: mockPostRefactorLDService,
        })

        // let's fetch the HPP from the new contract and revision tables
        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            draftWithRelatedRate.id
        )

        // check HPP post refactor to HPP pre refactor
        // finallySubmittedPKG is what came back from the last submission
        // fetchedHPP is what came back from fetchHPP with the rate refactor flag on
        expect(oldHPP.revisions).toHaveLength(fetchedHPP.revisions.length)

        const preFDS: HealthPlanFormDataType[] = []
        const postFDS: HealthPlanFormDataType[] = []
        for (let i = 0; i < oldHPP.revisions.length; i++) {
            const preRev = oldHPP.revisions[i].node
            const postRev = fetchedHPP.revisions[i].node

            const preFD = base64ToDomain(preRev.formDataProto)
            const postFD = base64ToDomain(postRev.formDataProto)

            if (preFD instanceof Error || postFD instanceof Error) {
                throw new Error('Got an error decoding')
            }

            preFDS.push(preFD)
            postFDS.push(postFD)
        }

        // in this case, because we're submitting a rate, we're getting back fake revisions
        const preFD = preFDS[0] as LockedHealthPlanFormDataType
        const postFD = postFDS[0] as LockedHealthPlanFormDataType

        // ignore submittedAt and updatedAt
        postFD.updatedAt = preFD.updatedAt
        postFD.submittedAt = preFD.submittedAt

        // deepStrictEqual args: actual comes first then expected
        assert.deepStrictEqual(postFD, preFD, 'form data not equal')
    }, 20000)
})
