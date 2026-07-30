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
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { packageName } from '@mc-review/submissions'

describe('fetchRevisionDiff', () => {
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
    })
})
