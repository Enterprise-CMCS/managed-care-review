import { todaysDate } from '../testHelpers/dateHelpers'
import _ from 'lodash'
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
import {
    base64ToDomain,
    toDomain,
} from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import { convertContractWithRatesToUnlockedHPP } from '../domain-models'

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

        // let's get the original HPP
        const fetchedHPP = await fetchTestHealthPlanPackageById(
            stateServerPost,
            finallySubmittedPKG.id
        )

        // get the migrated contract with history
        const fetchedMigratedContract = await findContractWithHistory(
            prismaClient,
            finallySubmittedPKG.id
        )
        if (fetchedMigratedContract instanceof Error) {
            throw new Error(
                `could not get back migrated contract after migrate: ${fetchedMigratedContract.message}`
            )
        }
        console.info(`Original HPP: ${JSON.stringify(fetchedHPP)}`)

        // check that we have the same number of revisions
        expect(fetchedMigratedContract.revisions).toHaveLength(
            fetchedHPP.revisions.length
        )

        // check that the IDs line up
        expect(fetchedMigratedContract.id).toBe(fetchedHPP.id)

        // convert to HPP
        const migratedConvertedContract = convertContractWithRatesToUnlockedHPP(
            fetchedMigratedContract
        )
        if (migratedConvertedContract instanceof Error) {
            throw new Error(
                `could not convert contract to unlocked hpp ${migratedConvertedContract.message}`
            )
        }

        // look at each of the revisions
        const fetchedHPPRevisionsById = new Map(
            fetchedHPP.revisions.map((revision) => {
                return [revision.node.id, revision.node]
            })
        )

        const fetchedConvertedContractRevisionsById = new Map(
            migratedConvertedContract.revisions.map((revision) => [
                revision.id,
                revision,
            ])
        )
        for (const id of fetchedConvertedContractRevisionsById.keys()) {
            console.info(`comparing ${id}`)
            const migratedContractToCompare =
                fetchedConvertedContractRevisionsById.get(id)
            if (migratedContractToCompare === undefined) {
                throw new Error(
                    `could not find the migrated contract id in map`
                )
            }

            const hppRevisionToCompare = fetchedHPPRevisionsById.get(id)
            if (hppRevisionToCompare === undefined) {
                throw new Error(
                    `migrated contract revision of id ${id} not found in HPP revisions`
                )
            }

            // decode the form data on the hpp
            const decodedFormDataProtoHppRev = base64ToDomain(
                hppRevisionToCompare.formDataProto
            )

            // decode the form data on the migrated contract
            const decodedFormDataProtoContractRev = toDomain(
                migratedContractToCompare.formDataProto
            )

            console.info(
                `${JSON.stringify(decodedFormDataProtoHppRev, null, '  ')}`
            )
            console.info(
                `${JSON.stringify(decodedFormDataProtoContractRev, null, '  ')}`
            )

            const diff = getObjectDiff(
                decodedFormDataProtoContractRev,
                decodedFormDataProtoHppRev
            )
            console.info(`${diff.length} keys differ: ${diff}`)
            expect(
                isEqualData(
                    decodedFormDataProtoContractRev,
                    decodedFormDataProtoHppRev
                )
            ).toBeTruthy()
        }
    }, 20000)
})

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
