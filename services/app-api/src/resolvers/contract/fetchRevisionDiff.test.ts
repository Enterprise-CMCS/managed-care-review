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
    async function createResubmittedContractWithAllDiffChanges() {
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
        if (!draftWithTwoRates.draftRevision) {
            throw new Error(
                'Unexpected error: draft revision missing after adding second rate'
            )
        }
        const initialDraftContract = await updateTestContractDraftRevision(
            stateServer,
            draftWithTwoRates.id,
            draftWithTwoRates.draftRevision.updatedAt,
            {
                ...draftWithTwoRates.draftRevision.formData,
                contractDateStart: '2027-01-01',
                contractDateEnd: '2028-01-01',
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
                stateContacts: [
                    {
                        name: 'Unchanged Person',
                        titleRole: 'Director',
                        email: 'unchanged@example.com',
                    },
                    {
                        name: 'Modified Person',
                        titleRole: 'Manager',
                        email: 'modified@example.com',
                    },
                ],
            }
        )

        const contract = await submitTestContract(
            stateServer,
            initialDraftContract.id,
            'Initial submission with full diff setup'
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
            'Unlock to update full revision diff coverage'
        )

        const existingDraftRates = unlockedContract.draftRates ?? []
        const revisedDraftRate = existingDraftRates[0]
        const removedDraftRate = existingDraftRates[1]

        if (!revisedDraftRate?.draftRevision || !removedDraftRate) {
            throw new Error(
                'Unexpected error: expected two draft rates for rate diff test'
            )
        }

        const contractWithLinkedRate = await updateTestDraftRatesOnContract(
            stateServer,
            addLinkedRateToRateInput(
                updateRatesInputFromDraftContract(unlockedContract),
                sharedRateID
            )
        )
        if (!contractWithLinkedRate.draftRevision) {
            throw new Error(
                'Unexpected error: draft revision missing after linking shared rate'
            )
        }
        const linkedDraftRate = contractWithLinkedRate.draftRates?.find(
            (rate) => rate.id === revisedDraftRate.id
        )

        if (!linkedDraftRate?.draftRevision) {
            throw new Error(
                'Unexpected error: revised draft rate not found after linking shared rate'
            )
        }

        const updatedContract = await updateTestContractDraftRevision(
            stateServer,
            contract.id,
            contractWithLinkedRate.draftRevision.updatedAt,
            {
                ...contractWithLinkedRate.draftRevision.formData,
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

        const updatedDraftRate = updatedContract.draftRates?.find(
            (rate) => rate.id === revisedDraftRate.id
        )

        if (!updatedDraftRate?.draftRevision) {
            throw new Error(
                'Unexpected error: updated draft rate not found after contract update'
            )
        }

        const updatedRateFormData = formatRateDataForSending(
            updatedDraftRate.draftRevision.formData
        )
        const existingAddtlActuaryContact =
            updatedRateFormData.addtlActuaryContacts?.[0]

        if (!existingAddtlActuaryContact) {
            throw new Error(
                'Unexpected error: expected additional actuary contact missing from revised rate test data'
            )
        }

        const rateUpdateInput =
            updateRatesInputFromDraftContract(updatedContract)
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
                              certifyingActuaryContacts: [
                                  {
                                      ...updatedRateFormData
                                          .certifyingActuaryContacts[0],
                                      actuarialFirm: 'MILLIMAN' as const,
                                  },
                              ],
                              addtlActuaryContacts: [
                                  {
                                      ...existingAddtlActuaryContact,
                                      actuarialFirm: 'OPTUMAS' as const,
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

        const resubmittedContract = await submitTestContract(
            stateServer,
            contract.id,
            'Resubmission with rate changes'
        )

        return {
            cmsServer,
            contract,
            updatedDraftRate,
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
        // wrapped in its serialized { valueType, value } shape (null when unanswered).
        expect(changesByPath).toEqual({
            contractName: {
                fieldPath: 'contractName',
                oldValue: { valueType: 'STRING', value: oldContractName },
                newValue: { valueType: 'STRING', value: newContractName },
            },
            programIDs: {
                fieldPath: 'programIDs',
                oldValue: {
                    valueType: 'STRING_ARRAY',
                    value: [statePrograms[0].id],
                },
                newValue: {
                    valueType: 'STRING_ARRAY',
                    value: sortedProgramIDs,
                },
            },
            submissionDescription: {
                fieldPath: 'submissionDescription',
                oldValue: {
                    valueType: 'STRING',
                    value: 'Original description',
                },
                newValue: {
                    valueType: 'STRING',
                    value: 'Resubmitted description',
                },
            },
            contractType: {
                fieldPath: 'contractType',
                oldValue: { valueType: 'STRING', value: 'BASE' },
                newValue: { valueType: 'STRING', value: 'AMENDMENT' },
            },
            populationCovered: {
                fieldPath: 'populationCovered',
                oldValue: { valueType: 'STRING', value: 'MEDICAID' },
                newValue: {
                    valueType: 'STRING',
                    value: 'MEDICAID_AND_CHIP',
                },
            },
            riskBasedContract: {
                fieldPath: 'riskBasedContract',
                oldValue: { valueType: 'BOOLEAN', value: false },
                newValue: { valueType: 'BOOLEAN', value: true },
            },
            dsnpContract: {
                fieldPath: 'dsnpContract',
                // Old revision left dsnpContract unanswered, so it serializes to null.
                oldValue: null,
                newValue: { valueType: 'BOOLEAN', value: true },
            },
            contractExecutionStatus: {
                fieldPath: 'contractExecutionStatus',
                oldValue: { valueType: 'STRING', value: 'UNEXECUTED' },
                newValue: { valueType: 'STRING', value: 'EXECUTED' },
            },
            contractDateStart: {
                fieldPath: 'contractDateStart',
                oldValue: { valueType: 'DATE', value: new Date('2027-01-01') },
                newValue: { valueType: 'DATE', value: new Date('2027-05-15') },
            },
            contractDateEnd: {
                fieldPath: 'contractDateEnd',
                oldValue: { valueType: 'DATE', value: new Date('2028-01-01') },
                newValue: { valueType: 'DATE', value: new Date('2028-05-15') },
            },
            managedCareEntities: {
                fieldPath: 'managedCareEntities',
                oldValue: { valueType: 'STRING_ARRAY', value: ['MCO'] },
                newValue: {
                    valueType: 'STRING_ARRAY',
                    value: ['MCO', 'PIHP', 'PAHP', 'PCCM'],
                },
            },
            federalAuthorities: {
                fieldPath: 'federalAuthorities',
                oldValue: { valueType: 'STRING_ARRAY', value: ['TITLE_XXI'] },
                newValue: {
                    valueType: 'STRING_ARRAY',
                    value: ['STATE_PLAN', 'WAIVER_1115', 'TITLE_XXI'],
                },
            },
            inLieuServicesAndSettings: {
                fieldPath: 'inLieuServicesAndSettings',
                oldValue: { valueType: 'BOOLEAN', value: false },
                newValue: { valueType: 'BOOLEAN', value: true },
            },
            modifiedBenefitsProvided: {
                fieldPath: 'modifiedBenefitsProvided',
                oldValue: { valueType: 'BOOLEAN', value: false },
                newValue: { valueType: 'BOOLEAN', value: true },
            },
            modifiedGeoAreaServed: {
                fieldPath: 'modifiedGeoAreaServed',
                oldValue: { valueType: 'BOOLEAN', value: false },
                newValue: { valueType: 'BOOLEAN', value: true },
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
            ratesDocuments: [],
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
        } = await createResubmittedContractWithAllDiffChanges()

        const revisionDiff = await fetchTestRevisionDiff(cmsServer, {
            contractID: contract.id,
            newerContractRevisionID:
                latestPackageSubmission.contractRevision.id,
            olderContractRevisionID:
                previousPackageSubmission.contractRevision.id,
        })

        expect(revisionDiff.comparison.stateContactChanges).toEqual([
            {
                changeType: 'NEW_OR_MODIFIED',
                current: {
                    name: 'Modified Person',
                    titleRole: 'Senior Manager',
                    email: 'after@example.com',
                },
            },
            {
                changeType: 'NEW_OR_MODIFIED',
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
            revisedRateID,
            latestPackageSubmission,
            previousPackageSubmission,
        } = await createResubmittedContractWithAllDiffChanges()

        const revisionDiff = await fetchTestRevisionDiff(cmsServer, {
            contractID: contract.id,
            newerContractRevisionID:
                latestPackageSubmission.contractRevision.id,
            olderContractRevisionID:
                previousPackageSubmission.contractRevision.id,
        })

        expect(revisionDiff.comparison.documentChanges).toEqual({
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
                    rateID: revisedRateID,
                    rateCertificationName:
                        latestPackageSubmission.rateRevisions.find(
                            (rateRevision) =>
                                rateRevision.rateID === revisedRateID
                        )?.formData.rateCertificationName,
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
        } = await createResubmittedContractWithAllDiffChanges()

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
            addedRateCertificationName === undefined ||
            removedRateCertificationName === undefined ||
            revisedRateCertificationName === undefined
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
                    fieldChanges: [
                        {
                            fieldPath: 'rateDateCertified',
                            oldValue: {
                                valueType: 'DATE',
                                value: new Date('2024-01-02'),
                            },
                            newValue: {
                                valueType: 'DATE',
                                value: new Date('2024-04-15'),
                            },
                        },
                        {
                            fieldPath: 'rateCertificationName',
                            oldValue: {
                                valueType: 'STRING',
                                value: 'MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240102',
                            },
                            newValue: {
                                valueType: 'STRING',
                                value: 'MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240415',
                            },
                        },
                    ],
                    rateDocuments: {
                        added: ['rate-doc-added.xlsx'],
                        removed: ['ratedoc1.doc'],
                    },
                    supportingRateDocuments: {
                        added: ['rate-support-added.pdf'],
                        removed: ['ratesupdoc1.doc'],
                    },
                    certifyingActuaryContactChanges: [
                        {
                            changeType: 'NEW_OR_MODIFIED',
                            current: {
                                name: 'Foo Person',
                                titleRole: 'Bar Job',
                                email: 'foo@example.com',
                                actuarialFirm: 'MILLIMAN',
                            },
                        },
                    ],
                    addtlActuaryContactChanges: [
                        {
                            changeType: 'NEW_OR_MODIFIED',
                            current: {
                                name: 'Bar Person',
                                titleRole: 'Baz Job',
                                email: 'bar@example.com',
                                actuarialFirm: 'OPTUMAS',
                            },
                        },
                        {
                            changeType: 'NEW_OR_MODIFIED',
                            current: {
                                name: 'New Actuary',
                                titleRole: 'Senior Actuary',
                                email: 'new-actuary@example.com',
                                actuarialFirm: 'MERCER',
                            },
                        },
                    ],
                },
            ],
        })
    })
})
