import { findStatePrograms, NewPostgresStore } from '../../postgres'
import { expectToBeDefined, must } from '../../testHelpers/assertionHelpers'
import { mockSubmittableHealthPlanContract } from '../../testHelpers'
import { packageName } from '@mc-review/submissions'
import {
    InvalidRevisionDiffInputError,
    resolveRevisionPair,
} from './findRevisionDiffByContractID'
import { buildRevisionDiff } from './revisionDiffHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import {
    createAndUpdateTestContractWithRate,
    createAndSubmitTestContract,
    createAndSubmitTestContractWithRate,
    submitTestContract,
    unlockTestContract,
    updateTestContractDraftRevision,
} from '../../testHelpers/gqlContractHelpers'
import {
    addNewRateToTestContract,
    formatRateDataForSending,
    addLinkedRateToRateInput,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

const mockStateUser = () => ({
    id: 'state-user-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    givenName: 'Aang',
    familyName: 'Avatar',
    email: 'aang@example.com',
    role: 'STATE_USER' as const,
    stateCode: 'KY',
})

describe('revisionDiffHelpers', () => {
    it('builds data-only field changes for a submitted revision comparison', async () => {
        // Setup test API and prisma client.
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Setup test form data
        const statePrograms = must(findStatePrograms('FL'))
        expect(statePrograms.length).toBeGreaterThan(1)
        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [statePrograms[0].id],
        })
        const baseFormData = baseContract.draftRevision!.formData

        // Create test contract data using API to mimic real data.
        const contract = await createAndSubmitTestContract(stateServer, 'FL', {
            ...baseFormData,
            populationCovered: 'MEDICAID',
            dsnpContract: undefined,
            riskBasedContract: false,
            contractType: 'BASE',
            contractExecutionStatus: 'UNEXECUTED',
            contractDateStart: '2027-01-01',
            contractDateEnd: '2028-01-01',
            managedCareEntities: ['MCO'],
            federalAuthorities: ['TITLE_XXI'],
            inLieuServicesAndSettings: false,
            modifiedBenefitsProvided: false,
            modifiedGeoAreaServed: false,
            submissionDescription: 'Original description',
            programIDs: [statePrograms[0].id],
        })

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlock to update'
        )
        const draftRevision = unlockedContract.draftRevision

        await updateTestContractDraftRevision(
            stateServer,
            contract.id,
            draftRevision.updatedAt,
            {
                ...draftRevision.formData,
                populationCovered: 'MEDICAID_AND_CHIP',
                dsnpContract: true,
                riskBasedContract: true,
                contractType: 'AMENDMENT',
                contractExecutionStatus: 'EXECUTED',
                contractDateStart: '2027-05-15',
                contractDateEnd: '2028-05-15',
                managedCareEntities: ['MCO', 'PIHP', 'PAHP', 'PCCM'],
                federalAuthorities: ['STATE_PLAN', 'WAIVER_1115', 'TITLE_XXI'],
                inLieuServicesAndSettings: true,
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: true,
                submissionDescription: 'Resubmitted description',
                programIDs: [statePrograms[0].id, statePrograms[1].id],
            }
        )

        await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with changes'
        )

        const resubmittedContractDomainData =
            await postgresStore.findContractWithHistory(contract.id)

        if (resubmittedContractDomainData instanceof Error) {
            throw new Error(
                'Unexpected error: Prisma query findContractWithHistory resulted in error'
            )
        }

        // There should only be 2 submissions, latest one at index 1
        const latestSubmissionPackage =
            resubmittedContractDomainData.packageSubmissions[0]
        const previousSubmission =
            resubmittedContractDomainData.packageSubmissions[1]

        if (!latestSubmissionPackage) {
            throw new Error(
                'Unexpected error: latest package submission not found'
            )
        }
        if (!previousSubmission) {
            throw new Error(
                'Unexpected error: previous package submission not found'
            )
        }

        // Use test data to perform revision diff
        const comparison = buildRevisionDiff(
            contract.id,
            previousSubmission,
            latestSubmissionPackage,
            statePrograms
        )

        expect(comparison).toEqual({
            contractID: resubmittedContractDomainData.id,
            olderRevisionID: previousSubmission.contractRevision.id,
            newerRevisionID: latestSubmissionPackage.contractRevision.id,
            olderSubmittedAt:
                previousSubmission.contractRevision.submitInfo?.updatedAt,
            newerSubmittedAt:
                latestSubmissionPackage.contractRevision.submitInfo?.updatedAt,
            fieldChanges: [
                {
                    fieldPath: 'contractName',
                    oldValue: packageName(
                        'FL',
                        resubmittedContractDomainData.stateNumber,
                        [statePrograms[0].id],
                        statePrograms
                    ),
                    newValue: packageName(
                        'FL',
                        resubmittedContractDomainData.stateNumber,
                        [statePrograms[0].id, statePrograms[1].id],
                        statePrograms
                    ),
                },
                {
                    fieldPath: 'programIDs',
                    oldValue: [statePrograms[0].id],
                    newValue: [statePrograms[0].id, statePrograms[1].id].sort(),
                },
                {
                    fieldPath: 'submissionDescription',
                    oldValue: 'Original description',
                    newValue: 'Resubmitted description',
                },
                {
                    fieldPath: 'contractType',
                    oldValue: 'BASE',
                    newValue: 'AMENDMENT',
                },
                {
                    fieldPath: 'populationCovered',
                    oldValue: 'MEDICAID',
                    newValue: 'MEDICAID_AND_CHIP',
                },
                {
                    fieldPath: 'riskBasedContract',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'dsnpContract',
                    oldValue: undefined,
                    newValue: true,
                },
                {
                    fieldPath: 'contractExecutionStatus',
                    oldValue: 'UNEXECUTED',
                    newValue: 'EXECUTED',
                },
                {
                    fieldPath: 'contractDateStart',
                    oldValue: new Date('2027-01-01T00:00:00.000Z'),
                    newValue: new Date('2027-05-15T00:00:00.000Z'),
                },
                {
                    fieldPath: 'contractDateEnd',
                    oldValue: new Date('2028-01-01T00:00:00.000Z'),
                    newValue: new Date('2028-05-15T00:00:00.000Z'),
                },
                {
                    fieldPath: 'managedCareEntities',
                    oldValue: ['MCO'],
                    newValue: ['MCO', 'PIHP', 'PAHP', 'PCCM'],
                },
                {
                    fieldPath: 'federalAuthorities',
                    oldValue: ['TITLE_XXI'],
                    newValue: ['STATE_PLAN', 'WAIVER_1115', 'TITLE_XXI'],
                },
                {
                    fieldPath: 'inLieuServicesAndSettings',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedBenefitsProvided',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedGeoAreaServed',
                    oldValue: false,
                    newValue: true,
                },
            ],
            stateContactChanges: [],
            documentChanges: {
                contractDocuments: {
                    added: [],
                    removed: [],
                },
                contractSupportingDocuments: {
                    added: [],
                    removed: [],
                },
                ratesDocuments: [],
                totalAdded: 0,
                totalRemoved: 0,
            },
            rateChanges: {
                added: [],
                removed: [],
                revised: [],
            },
        })
    })

    it('selects the latest two submitted revisions by default', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
            }
        )

        expect(selected).toEqual({
            olderSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'older-revision',
                }),
            }),
            newerSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'newest-revision',
                }),
            }),
        })
    })

    it('selects the latest two unique submitted revisions by default when package submissions contain duplicates', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest duplicate package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older revision',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
            }
        )

        expect(selected).toEqual({
            olderSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'older-revision',
                }),
            }),
            newerSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'newest-revision',
                }),
                submitInfo: expect.objectContaining({
                    updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                }),
            }),
        })
    })

    it('returns an input error when only one revision id is provided', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
                olderContractRevisionID: 'older-revision',
            }
        )

        expect(selected).toBeInstanceOf(InvalidRevisionDiffInputError)
    })

    it('selects requested unique revisions when matching package submissions contain duplicates', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest duplicate package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-05T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older duplicate package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older revision',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
                olderContractRevisionID: 'older-revision',
                newerContractRevisionID: 'newest-revision',
            }
        )

        expect(selected).toEqual({
            olderSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'older-revision',
                }),
                submitInfo: expect.objectContaining({
                    updatedAt: new Date('2024-05-05T00:00:00.000Z'),
                }),
            }),
            newerSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'newest-revision',
                }),
                submitInfo: expect.objectContaining({
                    updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                }),
            }),
        })
    })

    it('does not report a programIDs change when the same program abbreviations are reordered', () => {
        const statePrograms = must(findStatePrograms('MN'))
        const snbcProgram = statePrograms.find(
            (program) => program.name === 'SNBC'
        )
        const pmapProgram = statePrograms.find(
            (program) => program.name === 'PMAP'
        )
        expectToBeDefined(snbcProgram)
        expectToBeDefined(pmapProgram)

        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [snbcProgram.id, pmapProgram.id],
        })
        const baseFormData = baseContract.draftRevision!.formData

        const comparison = buildRevisionDiff(
            'contract-1',
            {
                submitInfo: {
                    updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                    updatedBy: mockStateUser(),
                    updatedReason: 'Initial submission',
                },
                submittedRevisions: [],
                contractRevision: {
                    ...baseContract.draftRevision!,
                    id: 'older-revision',
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Initial submission',
                    },
                    formData: {
                        ...baseFormData,
                        programIDs: [snbcProgram.id, pmapProgram.id],
                    },
                },
                rateRevisions: [],
            },
            {
                submitInfo: {
                    updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                    updatedBy: mockStateUser(),
                    updatedReason: 'Resubmission',
                },
                submittedRevisions: [],
                contractRevision: {
                    ...baseContract.draftRevision!,
                    id: 'newer-revision',
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Resubmission',
                    },
                    formData: {
                        ...baseFormData,
                        programIDs: [pmapProgram.id, snbcProgram.id],
                    },
                },
                rateRevisions: [],
            },
            statePrograms
        )

        expect(comparison).not.toBeInstanceOf(Error)
        expect(
            comparison instanceof Error
                ? []
                : comparison.fieldChanges.filter(
                      (change) => change.fieldPath === 'programIDs'
                  )
        ).toEqual([])
        expect(
            comparison instanceof Error ? [] : comparison.stateContactChanges
        ).toEqual([])
    })

    it('reports only new and modified state contacts from the newer submission', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const statePrograms = must(findStatePrograms('FL'))
        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [statePrograms[0].id],
        })
        const baseFormData = baseContract.draftRevision!.formData

        const contract = await createAndSubmitTestContract(stateServer, 'FL', {
            ...baseFormData,
            programIDs: [statePrograms[0].id],
            contractDateStart: '2027-01-01',
            contractDateEnd: '2028-01-01',
            stateContacts: [
                {
                    name: 'Unchanged Person',
                    titleRole: 'Director',
                    email: 'unchanged@example.com',
                },
                {
                    name: 'Modified Person',
                    titleRole: 'Manager',
                    email: 'before@example.com',
                },
            ],
        })

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlock to update state contacts'
        )
        const draftRevision = unlockedContract.draftRevision

        await updateTestContractDraftRevision(
            stateServer,
            contract.id,
            draftRevision.updatedAt,
            {
                ...draftRevision.formData,
                programIDs: [statePrograms[0].id],
                contractDateStart: '2027-01-01',
                contractDateEnd: '2028-01-01',
                stateContacts: [
                    {
                        name: 'Unchanged Person',
                        titleRole: 'Director',
                        email: 'unchanged@example.com',
                    },
                    {
                        name: 'Modified Person',
                        titleRole: 'Senior Manager',
                        email: 'after@example.com',
                    },
                    {
                        name: 'New Person',
                        titleRole: 'Analyst',
                        email: 'new@example.com',
                    },
                ],
            }
        )

        await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with updated state contacts'
        )

        const resubmittedContractDomainData =
            await postgresStore.findContractWithHistory(contract.id)

        if (resubmittedContractDomainData instanceof Error) {
            throw new Error(
                'Unexpected error: Prisma query findContractWithHistory resulted in error'
            )
        }

        const latestSubmissionPackage =
            resubmittedContractDomainData.packageSubmissions[0]
        const previousSubmission =
            resubmittedContractDomainData.packageSubmissions[1]

        if (!latestSubmissionPackage || !previousSubmission) {
            throw new Error(
                'Unexpected error: missing submitted package revisions for diff test'
            )
        }

        const comparison = buildRevisionDiff(
            contract.id,
            previousSubmission,
            latestSubmissionPackage,
            statePrograms
        )

        expect(comparison).not.toBeInstanceOf(Error)
        expect(
            comparison instanceof Error ? [] : comparison.stateContactChanges
        ).toEqual([
            {
                kind: 'new_or_modified',
                current: {
                    name: 'Modified Person',
                    titleRole: 'Senior Manager',
                    email: 'after@example.com',
                },
            },
            {
                kind: 'new_or_modified',
                current: {
                    name: 'New Person',
                    titleRole: 'Analyst',
                    email: 'new@example.com',
                },
            },
        ])
    })

    it('reports contract and rate document add/remove changes with totals', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(
            stateServer,
            'FL',
            {
                contractDocuments: [
                    {
                        name: 'contract-keep.pdf',
                        s3URL: 's3://bucketname/key/contract-keep.pdf',
                        sha256: 'contract-keep',
                    },
                    {
                        name: 'contract-removed.pdf',
                        s3URL: 's3://bucketname/key/contract-removed.pdf',
                        sha256: 'contract-removed',
                    },
                ],
                supportingDocuments: [
                    {
                        name: 'support-keep.pdf',
                        s3URL: 's3://bucketname/key/support-keep.pdf',
                        sha256: 'support-keep',
                    },
                    {
                        name: 'support-removed.pdf',
                        s3URL: 's3://bucketname/key/support-removed.pdf',
                        sha256: 'support-removed',
                    },
                ],
            }
        )

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlock to update documents'
        )

        const draftRevision = unlockedContract.draftRevision
        const draftRate = unlockedContract.draftRates?.[0]

        if (!draftRate?.draftRevision) {
            throw new Error('Unexpected error: draft rate not found')
        }

        const updatedContract = await updateTestContractDraftRevision(
            stateServer,
            contract.id,
            draftRevision.updatedAt,
            {
                ...draftRevision.formData,
                contractDateStart: '2025-06-01',
                contractDateEnd: '2026-05-30',
                contractDocuments: [
                    {
                        name: 'contract-keep.pdf',
                        s3URL: 's3://bucketname/key/contract-keep.pdf',
                        sha256: 'contract-keep',
                    },
                    {
                        name: 'contract-added.pdf',
                        s3URL: 's3://bucketname/key/contract-added.pdf',
                        sha256: 'contract-added',
                    },
                ],
                supportingDocuments: [
                    {
                        name: 'support-keep.pdf',
                        s3URL: 's3://bucketname/key/support-keep.pdf',
                        sha256: 'support-keep',
                    },
                ],
            }
        )

        const updatedDraftRate = updatedContract.draftRates?.find(
            (rate) => rate.id === draftRate.id
        )

        if (!updatedDraftRate?.draftRevision) {
            throw new Error(
                'Unexpected error: updated draft rate not found after contract update'
            )
        }

        const updatedRateFormData = formatRateDataForSending(
            updatedDraftRate.draftRevision.formData
        )

        const rateUpdateInput =
            updateRatesInputFromDraftContract(updatedContract)
        const updatedRates = rateUpdateInput.updatedRates.map((rateUpdate) =>
            rateUpdate.type === 'UPDATE' && rateUpdate.rateID === draftRate.id
                ? {
                      ...rateUpdate,
                      formData: {
                          ...updatedRateFormData,
                          rateDateStart: '2024-01-01',
                          rateDateEnd: '2025-01-01',
                          rateDateCertified: '2024-01-02',
                          amendmentEffectiveDateStart: '2024-02-01',
                          amendmentEffectiveDateEnd: '2025-02-01',
                          rateDocuments: [
                              {
                                  name: 'rate-doc-added.xlsx',
                                  s3URL: 's3://bucketname/key/rate-doc-added.xlsx',
                                  sha256: 'rate-doc-added',
                              },
                          ],
                          supportingDocuments: [
                              {
                                  name: 'ratesupdoc2.doc',
                                  s3URL: 's3://bucketname/key/test1',
                                  sha256: 'foobar2',
                              },
                              {
                                  name: 'rate-support-added.pdf',
                                  s3URL: 's3://bucketname/key/rate-support-added.pdf',
                                  sha256: 'rate-support-added',
                              },
                          ],
                      },
                  }
                : rateUpdate
        )

        await updateTestDraftRatesOnContract(stateServer, {
            ...rateUpdateInput,
            updatedRates,
        })

        await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with updated documents'
        )

        const resubmittedContractDomainData =
            await postgresStore.findContractWithHistory(contract.id)

        if (resubmittedContractDomainData instanceof Error) {
            throw new Error(
                'Unexpected error: Prisma query findContractWithHistory resulted in error'
            )
        }

        const latestSubmissionPackage =
            resubmittedContractDomainData.packageSubmissions[0]
        const previousSubmission =
            resubmittedContractDomainData.packageSubmissions[1]

        if (!latestSubmissionPackage || !previousSubmission) {
            throw new Error(
                'Unexpected error: missing submitted package revisions for document diff test'
            )
        }

        const updatedRateCertificationName =
            updatedDraftRate.draftRevision.formData.rateCertificationName

        if (!updatedRateCertificationName) {
            throw new Error(
                'Unexpected error: updated draft rate certification name not found'
            )
        }

        const comparison = buildRevisionDiff(
            contract.id,
            previousSubmission,
            latestSubmissionPackage,
            must(findStatePrograms('FL'))
        )

        expect(comparison).not.toBeInstanceOf(Error)
        expect(
            comparison instanceof Error ? undefined : comparison.documentChanges
        ).toEqual({
            contractDocuments: {
                added: ['contract-added.pdf'],
                removed: ['contract-removed.pdf'],
            },
            contractSupportingDocuments: {
                added: [],
                removed: ['support-removed.pdf'],
            },
            ratesDocuments: [
                {
                    rateID: draftRate.id,
                    rateCertificationName: updatedRateCertificationName,
                    rateDocuments: {
                        added: ['rate-doc-added.xlsx'],
                        removed: ['ratedoc1.doc'],
                    },
                    supportingDocuments: {
                        added: ['rate-support-added.pdf'],
                        removed: ['ratesupdoc1.doc'],
                    },
                },
            ],
            totalAdded: 3,
            totalRemoved: 4,
        })
    })

    it('reports added, removed, and revised rates for a submitted revision comparison', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract = await createAndUpdateTestContractWithRate(
            stateServer,
            'FL'
        )
        const draftWithTwoRates = await addNewRateToTestContract(
            stateServer,
            draftContract
        )
        const contract = await submitTestContract(
            stateServer,
            draftWithTwoRates.id,
            'Initial submission with two rates'
        )

        const sharedRateSource = await createAndSubmitTestContractWithRate(
            stateServer,
            'FL'
        )
        const sharedRateID =
            sharedRateSource.packageSubmissions[0]?.rateRevisions[0]?.rateID

        if (!sharedRateID) {
            throw new Error('Unexpected error: shared rate source not found')
        }

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlock to update rates'
        )

        const existingDraftRates = unlockedContract.draftRates ?? []
        const revisedDraftRate = existingDraftRates[0]
        const removedDraftRate = existingDraftRates[1]

        if (!revisedDraftRate?.draftRevision || !removedDraftRate) {
            throw new Error(
                'Unexpected error: expected two draft rates for rate diff test'
            )
        }

        const linkedContract = await updateTestDraftRatesOnContract(
            stateServer,
            addLinkedRateToRateInput(
                updateRatesInputFromDraftContract(unlockedContract),
                sharedRateID
            )
        )
        const linkedDraftRate = linkedContract.draftRates?.find(
            (rate) => rate.id === revisedDraftRate.id
        )

        if (!linkedDraftRate?.draftRevision) {
            throw new Error(
                'Unexpected error: revised draft rate not found after linking shared rate'
            )
        }

        const updatedRateFormData = formatRateDataForSending(
            linkedDraftRate.draftRevision.formData
        )
        const rateUpdateInput =
            updateRatesInputFromDraftContract(linkedContract)
        const updatedRates = rateUpdateInput.updatedRates
            .filter(
                (rateUpdate) =>
                    !(
                        rateUpdate.type === 'UPDATE' &&
                        rateUpdate.rateID === removedDraftRate.id
                    )
            )
            .map((rateUpdate) =>
                rateUpdate.type === 'UPDATE' &&
                rateUpdate.rateID === revisedDraftRate.id
                    ? {
                          ...rateUpdate,
                          formData: {
                              ...updatedRateFormData,
                              rateDateCertified: '2024-04-15',
                              certifyingActuaryContacts: [
                                  {
                                      ...updatedRateFormData
                                          .certifyingActuaryContacts[0],
                                      actuarialFirm: 'MILLIMAN' as const,
                                  },
                                  {
                                      name: 'New Actuary',
                                      titleRole: 'Senior Actuary',
                                      email: 'new-actuary@example.com',
                                      actuarialFirm: 'MERCER' as const,
                                  },
                              ],
                          },
                      }
                    : rateUpdate
            )

        await updateTestDraftRatesOnContract(stateServer, {
            ...rateUpdateInput,
            updatedRates,
        })

        await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with rate changes'
        )

        const resubmittedContractDomainData =
            await postgresStore.findContractWithHistory(contract.id)

        if (resubmittedContractDomainData instanceof Error) {
            throw new Error(
                'Unexpected error: Prisma query findContractWithHistory resulted in error'
            )
        }

        const latestSubmissionPackage =
            resubmittedContractDomainData.packageSubmissions[0]
        const previousSubmission =
            resubmittedContractDomainData.packageSubmissions[1]

        if (!latestSubmissionPackage || !previousSubmission) {
            throw new Error(
                'Unexpected error: missing submitted package revisions for rate diff test'
            )
        }

        const addedRateCertificationName =
            latestSubmissionPackage.rateRevisions.find(
                (rateRevision) => rateRevision.rateID === sharedRateID
            )?.formData.rateCertificationName
        const removedRateCertificationName =
            previousSubmission.rateRevisions.find(
                (rateRevision) => rateRevision.rateID === removedDraftRate.id
            )?.formData.rateCertificationName
        const revisedRateCertificationName =
            latestSubmissionPackage.rateRevisions.find(
                (rateRevision) => rateRevision.rateID === revisedDraftRate.id
            )?.formData.rateCertificationName

        if (
            !addedRateCertificationName ||
            !removedRateCertificationName ||
            !revisedRateCertificationName
        ) {
            throw new Error(
                'Unexpected error: one or more expected rate certification names not found'
            )
        }

        const comparison = buildRevisionDiff(
            contract.id,
            previousSubmission,
            latestSubmissionPackage,
            must(findStatePrograms('FL'))
        )

        expect(comparison).not.toBeInstanceOf(Error)
        expect(
            comparison instanceof Error ? undefined : comparison.rateChanges
        ).toEqual({
            added: [
                {
                    rateID: sharedRateID,
                    rateCertificationName: addedRateCertificationName,
                    includedInAnotherSubmission: true,
                },
            ],
            removed: [
                {
                    rateID: removedDraftRate.id,
                    rateCertificationName: removedRateCertificationName,
                },
            ],
            revised: [
                {
                    rateID: revisedDraftRate.id,
                    rateCertificationName: revisedRateCertificationName,
                    fieldChanges: [
                        {
                            fieldPath: 'rateDateCertified',
                            oldValue: new Date('2024-01-02'),
                            newValue: new Date('2024-04-15'),
                        },
                        {
                            fieldPath: 'rateCertificationName',
                            oldValue:
                                'MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240102',
                            newValue:
                                'MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240415',
                        },
                    ],
                    certifyingActuaryContactChanges: [
                        {
                            kind: 'new_or_modified',
                            current: {
                                name: 'Foo Person',
                                titleRole: 'Bar Job',
                                email: 'foo@example.com',
                                actuarialFirm: 'MILLIMAN',
                            },
                            certifyingActuaryContactFieldChanges: [
                                {
                                    fieldPath: 'actuarialFirm',
                                    oldValue: 'GUIDEHOUSE',
                                    newValue: 'MILLIMAN',
                                },
                            ],
                        },
                        {
                            kind: 'new_or_modified',
                            current: {
                                name: 'New Actuary',
                                titleRole: 'Senior Actuary',
                                email: 'new-actuary@example.com',
                                actuarialFirm: 'MERCER',
                            },
                            certifyingActuaryContactFieldChanges: [],
                        },
                    ],
                },
            ],
        })
    })
})
