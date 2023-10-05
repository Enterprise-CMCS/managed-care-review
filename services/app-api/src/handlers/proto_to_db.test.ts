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
import {
    cleanupPreviousProtoMigrate,
    decodeFormDataProto,
    migrateRevision,
} from './proto_to_db'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { findAllRevisions } from '../postgres/healthPlanPackage'
import { isStoreError } from '../postgres'
import { findContractWithHistory } from '../postgres/contractAndRates'
import { isEqualData } from '../resolvers/healthPlanPackage/contractAndRates/resolverHelpers'
import { base64ToDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'

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

        const migratedRevisions = []
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
            migratedRevisions.push(migratedRevision)
        }

        const stateServerPost = await constructTestPostgresServer({
            ldService: mockPostRefactorLDService,
        })

        // let's get the original HPP
        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            finallySubmittedPKG.id
        )

        // let's look up the newly migrated contract
        const fetchMigratedContract = await findContractWithHistory(
            prismaClient,
            migratedRevisions[0].id
        )
        if (fetchMigratedContract instanceof Error) {
            const error = new Error(
                `Could not retrieve migrated contract: ${fetchMigratedContract.message}`
            )
            console.error(error)
            throw error
        }

        /*
        console.info(`Original HPP: ${JSON.stringify(fetchedHPP)}`)
        console.info(
            `Migrated contract: ${JSON.stringify(fetchMigratedContract)}`
        )
        */

        // Check that both objects have the same id
        expect(fetchMigratedContract.id).toEqual(fetchedHPP.id)

        // Check that both objects have the same stateCode
        expect(fetchMigratedContract.stateCode).toEqual(fetchedHPP.stateCode)

        // Check that both objects have the same status
        expect(fetchMigratedContract.status).toEqual(fetchedHPP.status)

        expect(fetchMigratedContract.revisions.length).toEqual(
            fetchedHPP.revisions.length
        )

        // collect the IDs of each revision in HPP and the migrated version
        const migratedContractRevisions = new Map(
            fetchMigratedContract.revisions.map((revision) => [
                revision.id,
                revision,
            ])
        )
        const originalHPPRevisions = new Map(
            fetchedHPP.revisions.map((revision) => [
                revision.node.id,
                revision.node,
            ])
        )
        for (const id of migratedContractRevisions.keys()) {
            // Make sure the id exists in both objects
            expect(originalHPPRevisions.has(id)).toBe(true)
            const migratedFormData =
                migratedContractRevisions.get(id)?.formData ?? {}
            const originalFormDataProto =
                originalHPPRevisions.get(id)?.formDataProto ?? ''

            // decode the HPP form data so we can compare the objects
            const decodedFormDataProto = base64ToDomain(originalFormDataProto)
            if (decodedFormDataProto instanceof Error) {
                const error = new Error(
                    `Error in base64ToDomain for ${id}: ${decodedFormDataProto.message}`
                )
                return error
            }

            // compare the two form data
            const diff = getObjectDiff(migratedFormData, decodedFormDataProto)
            console.info(`${diff.length} keys differ: ${diff}`)
            console.info(
                `decoded form data: ${JSON.stringify(
                    decodedFormDataProto,
                    null,
                    '  '
                )}`
            )
            console.info(
                `migrated form data: ${JSON.stringify(
                    migratedFormData,
                    null,
                    '  '
                )}`
            )
            expect(
                isEqualData(decodedFormDataProto, migratedFormData)
            ).toBeTruthy()
        }
    }, 20000)
})

import _ from 'lodash'

const getObjectDiff = (
    obj1: Record<string, any>,
    obj2: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    compareRef: boolean = false
): string[] => {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        throw new Error('Both inputs must be objects.')
    }

    return Object.keys(obj1).reduce((result, key) => {
        // eslint-disable-next-line no-prototype-builtins
        if (!obj2.hasOwnProperty(key)) {
            result.push(key)
        } else if (_.isEqual(obj1[key], obj2[key])) {
            const resultKeyIndex = result.indexOf(key)

            if (compareRef && obj1[key] !== obj2[key]) {
                result[resultKeyIndex] = `${key} (ref)`
            } else {
                result.splice(resultKeyIndex, 1)
            }
        }
        return result
    }, Object.keys(obj2))
}
