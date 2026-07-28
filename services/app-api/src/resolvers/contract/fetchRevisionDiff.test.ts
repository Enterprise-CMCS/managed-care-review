import { findStatePrograms } from '../../postgres'
import {
    createAndSubmitTestContract,
    fetchTestRevisionDiff,
    must,
    updateTestContractDraftRevision,
} from '../../testHelpers'
import { mockSubmittableHealthPlanContract } from '../../testHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import {
    createAndUpdateTestContractWithRate,
    createAndSubmitTestContractWithRate,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    addNewRateToTestContract,
    addLinkedRateToRateInput,
    formatRateDataForSending,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { packageName } from '@mc-review/submissions'

describe('fetchRevisionDiff', () => {
    async function createResubmittedContractWithStateContactChanges() {
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

        await updateTestContractDraftRevision(
            stateServer,
            contract.id,
            unlockedContract.draftRevision.updatedAt,
            {
                ...unlockedContract.draftRevision.formData,
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

        const resubmittedContract = await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with updated state contacts'
        )

        const latestPackageSubmission =
            resubmittedContract.packageSubmissions[0]
        const previousPackageSubmission =
            resubmittedContract.packageSubmissions[1]

        return {
            cmsServer,
            contract,
            latestPackageSubmission,
            previousPackageSubmission,
        }
    }

    async function createResubmittedContractWithDocumentChanges() {
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

        const draftRate = unlockedContract.draftRates?.[0]
        if (!draftRate?.draftRevision) {
            throw new Error('Unexpected error: draft rate not found')
        }

        const updatedContract = await updateTestContractDraftRevision(
            stateServer,
            contract.id,
            unlockedContract.draftRevision.updatedAt,
            {
                ...unlockedContract.draftRevision.formData,
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

        const resubmittedContract = await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with updated documents'
        )

        return {
            cmsServer,
            contract,
            draftRate,
            updatedDraftRate,
            latestPackageSubmission: resubmittedContract.packageSubmissions[0],
            previousPackageSubmission:
                resubmittedContract.packageSubmissions[1],
        }
    }

    async function createResubmittedContractWithRateChanges() {
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
                          },
                      }
                    : rateUpdate
            )

        await updateTestDraftRatesOnContract(stateServer, {
            ...rateUpdateInput,
            updatedRates,
        })

        const resubmittedContract = await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with rate changes'
        )

        return {
            cmsServer,
            contract,
            sharedRateID,
            revisedRateID: revisedDraftRate.id,
            removedRateID: removedDraftRate.id,
            latestPackageSubmission: resubmittedContract.packageSubmissions[0],
            previousPackageSubmission:
                resubmittedContract.packageSubmissions[1],
        }
    }

    it('returns the store-backed diff through the GraphQL resolver', async () => {
        // Setup test API.
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

        const resubmittedContract = await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with changes'
        )

        const latestPackageSubmission =
            resubmittedContract.packageSubmissions[0]
        const previousPackageSubmission =
            resubmittedContract.packageSubmissions[1]

        // Call actual fetchRevisionDiff resolver using the API and returning a graphql response
        const revisionDiff = await fetchTestRevisionDiff(cmsServer, {
            contractID: contract.id,
            newerContractRevisionID:
                latestPackageSubmission.contractRevision.id,
            olderContractRevisionID:
                previousPackageSubmission.contractRevision.id,
        })

        // The payload points at the two revisions being compared.
        expect(revisionDiff.contractID).toBe(contract.id)
        expect(revisionDiff.comparison.olderRevisionID).toBe(
            previousPackageSubmission.contractRevision.id
        )
        expect(revisionDiff.comparison.newerRevisionID).toBe(
            latestPackageSubmission.contractRevision.id
        )

        // Key the diff by field path so we can assert the whole set at once.
        const changesByPath = Object.fromEntries(
            revisionDiff.comparison.fieldChanges.map((change) => [
                change.fieldPath,
                change,
            ])
        )

        // contractName is derived from the state number + program abbreviations,
        // so build the expected values with the same helper the resolver uses.
        const oldContractName = packageName(
            resubmittedContract.stateCode,
            resubmittedContract.stateNumber,
            [statePrograms[0].id],
            statePrograms
        )
        const newContractName = packageName(
            resubmittedContract.stateCode,
            resubmittedContract.stateNumber,
            [statePrograms[0].id, statePrograms[1].id],
            statePrograms
        )

        // programIDs are normalized with a stable sort before diffing.
        const sortedProgramIDs = [
            statePrograms[0].id,
            statePrograms[1].id,
        ].sort()

        // Exactly the fields changed between the two submissions diff, each
        // wrapped in its serialized { kind, value } shape (null when unanswered).
        expect(changesByPath).toEqual({
            contractName: {
                fieldPath: 'contractName',
                oldValue: { kind: 'STRING', value: oldContractName },
                newValue: { kind: 'STRING', value: newContractName },
            },
            programIDs: {
                fieldPath: 'programIDs',
                oldValue: {
                    kind: 'STRING_ARRAY',
                    value: [statePrograms[0].id],
                },
                newValue: { kind: 'STRING_ARRAY', value: sortedProgramIDs },
            },
            submissionDescription: {
                fieldPath: 'submissionDescription',
                oldValue: { kind: 'STRING', value: 'Original description' },
                newValue: { kind: 'STRING', value: 'Resubmitted description' },
            },
            contractType: {
                fieldPath: 'contractType',
                oldValue: { kind: 'STRING', value: 'BASE' },
                newValue: { kind: 'STRING', value: 'AMENDMENT' },
            },
            populationCovered: {
                fieldPath: 'populationCovered',
                oldValue: { kind: 'STRING', value: 'MEDICAID' },
                newValue: { kind: 'STRING', value: 'MEDICAID_AND_CHIP' },
            },
            riskBasedContract: {
                fieldPath: 'riskBasedContract',
                oldValue: { kind: 'BOOLEAN', value: false },
                newValue: { kind: 'BOOLEAN', value: true },
            },
            dsnpContract: {
                fieldPath: 'dsnpContract',
                // Old revision left dsnpContract unanswered, so it serializes to null.
                oldValue: null,
                newValue: { kind: 'BOOLEAN', value: true },
            },
            contractExecutionStatus: {
                fieldPath: 'contractExecutionStatus',
                oldValue: { kind: 'STRING', value: 'UNEXECUTED' },
                newValue: { kind: 'STRING', value: 'EXECUTED' },
            },
            contractDateStart: {
                fieldPath: 'contractDateStart',
                oldValue: { kind: 'DATE', value: new Date('2027-01-01') },
                newValue: { kind: 'DATE', value: new Date('2027-05-15') },
            },
            contractDateEnd: {
                fieldPath: 'contractDateEnd',
                oldValue: { kind: 'DATE', value: new Date('2028-01-01') },
                newValue: { kind: 'DATE', value: new Date('2028-05-15') },
            },
            managedCareEntities: {
                fieldPath: 'managedCareEntities',
                oldValue: { kind: 'STRING_ARRAY', value: ['MCO'] },
                newValue: {
                    kind: 'STRING_ARRAY',
                    value: ['MCO', 'PIHP', 'PAHP', 'PCCM'],
                },
            },
            federalAuthorities: {
                fieldPath: 'federalAuthorities',
                oldValue: { kind: 'STRING_ARRAY', value: ['TITLE_XXI'] },
                newValue: {
                    kind: 'STRING_ARRAY',
                    value: ['STATE_PLAN', 'WAIVER_1115', 'TITLE_XXI'],
                },
            },
            inLieuServicesAndSettings: {
                fieldPath: 'inLieuServicesAndSettings',
                oldValue: { kind: 'BOOLEAN', value: false },
                newValue: { kind: 'BOOLEAN', value: true },
            },
            modifiedBenefitsProvided: {
                fieldPath: 'modifiedBenefitsProvided',
                oldValue: { kind: 'BOOLEAN', value: false },
                newValue: { kind: 'BOOLEAN', value: true },
            },
            modifiedGeoAreaServed: {
                fieldPath: 'modifiedGeoAreaServed',
                oldValue: { kind: 'BOOLEAN', value: false },
                newValue: { kind: 'BOOLEAN', value: true },
            },
        })
        expect(revisionDiff.comparison.stateContactChanges).toEqual([])
        expect(revisionDiff.comparison.documentChanges).toEqual({
            contractDocuments: {
                added: [],
                removed: [],
            },
            contractSupportingDocuments: {
                added: [],
                removed: [],
            },
            rates: [],
            totalAdded: 0,
            totalRemoved: 0,
        })
        expect(revisionDiff.comparison.rateChanges).toEqual({
            added: [],
            removed: [],
            revised: [],
        })
    })

    it('returns only new and modified state contacts through the GraphQL resolver', async () => {
        const {
            cmsServer,
            contract,
            latestPackageSubmission,
            previousPackageSubmission,
        } = await createResubmittedContractWithStateContactChanges()

        const revisionDiff = await fetchTestRevisionDiff(cmsServer, {
            contractID: contract.id,
            newerContractRevisionID:
                latestPackageSubmission.contractRevision.id,
            olderContractRevisionID:
                previousPackageSubmission.contractRevision.id,
        })

        expect(revisionDiff.comparison.stateContactChanges).toEqual([
            {
                kind: 'NEW_OR_MODIFIED',
                current: {
                    name: 'Modified Person',
                    titleRole: 'Senior Manager',
                    email: 'after@example.com',
                },
            },
            {
                kind: 'NEW_OR_MODIFIED',
                current: {
                    name: 'New Person',
                    titleRole: 'Analyst',
                    email: 'new@example.com',
                },
            },
        ])
    })

    it('returns contract and rate document changes through the GraphQL resolver', async () => {
        const {
            cmsServer,
            contract,
            updatedDraftRate,
            latestPackageSubmission,
            previousPackageSubmission,
        } = await createResubmittedContractWithDocumentChanges()

        const revisionDiff = await fetchTestRevisionDiff(cmsServer, {
            contractID: contract.id,
            newerContractRevisionID:
                latestPackageSubmission.contractRevision.id,
            olderContractRevisionID:
                previousPackageSubmission.contractRevision.id,
        })

        const updatedRateCertificationName =
            updatedDraftRate.draftRevision?.formData.rateCertificationName

        if (!updatedRateCertificationName) {
            throw new Error(
                'Unexpected error: updated draft rate certification name not found'
            )
        }

        expect(revisionDiff.comparison.documentChanges).toEqual({
            contractDocuments: {
                added: ['contract-added.pdf'],
                removed: ['contract-removed.pdf'],
            },
            contractSupportingDocuments: {
                added: [],
                removed: ['support-removed.pdf'],
            },
            rates: [
                {
                    rateID: updatedDraftRate.id,
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

    it('returns added, removed, and revised rates through the GraphQL resolver', async () => {
        const {
            cmsServer,
            contract,
            sharedRateID,
            revisedRateID,
            removedRateID,
            latestPackageSubmission,
            previousPackageSubmission,
        } = await createResubmittedContractWithRateChanges()

        const revisionDiff = await fetchTestRevisionDiff(cmsServer, {
            contractID: contract.id,
            newerContractRevisionID:
                latestPackageSubmission.contractRevision.id,
            olderContractRevisionID:
                previousPackageSubmission.contractRevision.id,
        })

        const addedRateCertificationName =
            latestPackageSubmission.rateRevisions.find(
                (rateRevision) => rateRevision.rateID === sharedRateID
            )?.formData.rateCertificationName
        const removedRateCertificationName =
            previousPackageSubmission.rateRevisions.find(
                (rateRevision) => rateRevision.rateID === removedRateID
            )?.formData.rateCertificationName
        const revisedRateCertificationName =
            latestPackageSubmission.rateRevisions.find(
                (rateRevision) => rateRevision.rateID === revisedRateID
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

        expect(revisionDiff.comparison.rateChanges).toEqual({
            added: [
                {
                    rateID: sharedRateID,
                    rateCertificationName: addedRateCertificationName,
                    includedInAnotherSubmission: true,
                },
            ],
            removed: [
                {
                    rateID: removedRateID,
                    rateCertificationName: removedRateCertificationName,
                },
            ],
            revised: [
                {
                    rateID: revisedRateID,
                    rateCertificationName: revisedRateCertificationName,
                },
            ],
        })
    })
})
