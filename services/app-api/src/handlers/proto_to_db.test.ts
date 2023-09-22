import { todaysDate } from '../testHelpers/dateHelpers'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    fetchTestHealthPlanPackageById,
    resubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanFormData,
} from '../testHelpers/gqlHelpers'
import { latestFormData } from '../testHelpers/healthPlanPackageHelpers'
import { testLDService } from '../testHelpers/launchDarklyHelpers'
import { testCMSUser } from '../testHelpers/userHelpers'
import UNLOCK_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/unlockHealthPlanPackage.graphql'
import { migrateRevision } from './proto_to_db'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'

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
                        s3URL: 'foo://bar',
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

        console.info(
            `finally submitted package: ${JSON.stringify(
                finallySubmittedPKG,
                null,
                '  '
            )}`
        )

        const prismaClient = await sharedTestPrismaClient()
        const migratedRevisions = []
        for (const revision of finallySubmittedPKG.revisions) {
            const migratedRevision = await migrateRevision(
                prismaClient,
                revision.node
            )
            migratedRevisions.push(migratedRevision)
        }

        /*
        const stateServerPost = await constructTestPostgresServer({
            ldService: mockPostRefactorLDService,
        })

        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            finallySubmittedPKG.id
        )
        */

        console.info(
            `Migrated revisions: ${JSON.stringify(
                migratedRevisions,
                null,
                '  '
            )}`
        )
        //console.info(JSON.stringify(fetchedHPP, null, '  '))

        throw new Error('Not done with this test yet')
    }, 20000)
})
