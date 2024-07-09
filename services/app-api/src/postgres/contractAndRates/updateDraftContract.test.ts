import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import {
    clearDocMetadata,
    mockInsertContractArgs,
    must,
} from '../../testHelpers'
import { updateDraftContract } from './updateDraftContract'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'
import type { ContractType } from '@prisma/client'
import type {
    ContractFormDataType,
    ContractFormEditableType,
} from '../../domain-models/contractAndRates'

describe('updateDraftContractWithRates postgres', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('updates drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1 = mockInsertContractArgs({})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { stateCode, ...draftContractFormData } = draftContractForm1
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        const draftContractForm2 = {
            ...draftContractFormData,
            submissionDescription: 'something else',
        }
        const draft = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.submissionDescription).toBe(
            'something else'
        )
    })

    function completeTestContract(): ContractFormEditableType {
        return {
            programIDs: ['5904a736-4422-4b78-abef-f3df3d0ae21d'],
            populationCovered: 'MEDICAID' as const,
            submissionType: 'CONTRACT_ONLY' as const,
            riskBasedContract: false,
            submissionDescription: 'Test',
            stateContacts: [
                {
                    name: 'Foo Person',
                    email: 'foo@example.com',
                    titleRole: 'Foo Role',
                },
            ],
            supportingDocuments: [
                {
                    name: 'contract supporting doc',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: '2342fwlkdmwvw',
                },
                {
                    name: 'contract supporting doc 2',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: '45662342fwlkdmwvw',
                },
            ],
            contractType: 'BASE',
            contractExecutionStatus: 'EXECUTED',
            contractDocuments: [
                {
                    name: 'contract doc',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: '8984234fwlkdmwvw',
                },
            ],
            contractDateStart: new Date(Date.UTC(2025, 5, 1)),
            contractDateEnd: new Date(Date.UTC(2026, 4, 30)),
            managedCareEntities: ['MCO'],
            federalAuthorities: ['STATE_PLAN' as const],
            modifiedBenefitsProvided: false,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: false,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: false,
            modifiedPaymentsForMentalDiseaseInstitutions: false,
            modifiedMedicalLossRatioStandards: false,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: false,
            modifiedGrevienceAndAppeal: false,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: true,
            modifiedNonRiskPaymentArrangements: true,
            inLieuServicesAndSettings: true,
            statutoryRegulatoryAttestation: false,
            statutoryRegulatoryAttestationDescription: 'No compliance',
        }
    }

    function emptyTestContract(): Partial<ContractFormDataType> {
        return {
            programIDs: ['5904a736-4422-4b78-abef-f3df3d0ae21d'],
            populationCovered: 'MEDICAID' as const,
            submissionType: 'CONTRACT_ONLY' as const,
            riskBasedContract: false,
            submissionDescription: 'Test',
        }
    }

    it('allows for removing all fields', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1 = mockInsertContractArgs({})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        const fullContract = completeTestContract()
        const draft = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: fullContract,
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.submissionDescription).toBe('Test')

        const emptyContract = emptyTestContract()

        const emptyDraft = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: emptyContract,
            })
        )

        expect(emptyDraft.draftRevision).toBeDefined()
        expect(
            emptyDraft.draftRevision?.formData.modifiedBenefitsProvided
        ).toBeUndefined()
        expect(emptyDraft.draftRevision?.formData.federalAuthorities).toEqual(
            []
        )
    })

    it('updates linked documents as expected in multiple requests', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1: ContractFormEditableType = {
            submissionDescription: 'draftData1',
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/contract1',
                    name: 'Rate cert 1',
                    sha256: 'shaS56',
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/contractsupporting1-1',
                    name: 'supporting documents 1-1',
                    sha256: 'shaS56',
                },
            ],
        }
        // documents all replaced, additional supporting docs added
        const draftContractForm2: ContractFormEditableType = {
            submissionDescription: 'draftData2',
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/contract2',
                    name: 'Rate cert 2',
                    sha256: 'shaS56',
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/contractsupporting2-1',
                    name: 'supporting documents 2-1',
                    sha256: 'shaS56',
                },
                {
                    s3URL: 's3://bucketname/key/contractsupporting2-2',
                    name: 'supporting documents2-2',
                    sha256: 'shaS56',
                },
            ],
        }

        // documents unchanged
        const draftContractForm3: ContractFormEditableType = {
            submissionDescription: 'draftData3',
            contractDocuments: draftContractForm2.contractDocuments,
            supportingDocuments: draftContractForm1.supportingDocuments,
        }

        const contract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )

        const draft1 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm1,
            })
        )

        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)
        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)

        const draft2 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
            })
        )

        expect(draft2.draftRevision?.formData.submissionDescription).toBe(
            'draftData2'
        )

        expect(
            clearDocMetadata(draft2.draftRevision?.formData.contractDocuments)
        ).toEqual(draftContractForm2.contractDocuments)
        expect(
            clearDocMetadata(draft2.draftRevision?.formData.supportingDocuments)
        ).toEqual(draftContractForm2.supportingDocuments)

        const draft3 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm3,
            })
        )
        expect(draft3.draftRevision?.formData.submissionDescription).toBe(
            'draftData3'
        )
        expect(
            clearDocMetadata(draft3.draftRevision?.formData.supportingDocuments)
        ).toHaveLength(1)
        expect(
            clearDocMetadata(draft3.draftRevision?.formData.contractDocuments)
        ).toEqual(draftContractForm3.contractDocuments)
        expect(
            clearDocMetadata(draft3.draftRevision?.formData.supportingDocuments)
        ).toEqual(draftContractForm3.supportingDocuments)
    })

    it('updates linked contacts as expected in multiple requests', async () => {
        const client = await sharedTestPrismaClient()
        const draftContractForm1: ContractFormEditableType = {
            submissionDescription: 'draftData1',
            stateContacts: [
                {
                    name: 'Certifying Actuary 1',
                    titleRole: 'Test Certifying Actuary 1',
                    email: 'certifying1@example.com',
                },
            ],
        }
        // all contacts replaced
        const draftContractForm2: ContractFormEditableType = {
            submissionDescription: 'draftData2',
            stateContacts: [
                {
                    name: 'Certifying Actuary 2',
                    titleRole: 'Test Certifying Actuary 2',
                    email: 'certifying2@example.com',
                },
            ],
        }

        // contacts values unchanged
        const draftContractForm3: ContractFormEditableType = {
            submissionDescription: 'draftData3',
            stateContacts: draftContractForm2.stateContacts,
        }

        const contract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )

        const draft1 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm1,
            })
        )

        expect(draft1.draftRevision?.formData.stateContacts).toHaveLength(1)

        const draft2 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
            })
        )

        expect(draft2.draftRevision?.formData.submissionDescription).toBe(
            'draftData2'
        )
        expect(draft2.draftRevision?.formData.stateContacts).toEqual(
            draftContractForm2.stateContacts
        )

        const draft3 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm3,
            })
        )
        expect(draft3.draftRevision?.formData.submissionDescription).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.stateContacts).toEqual(
            draftContractForm3.stateContacts
        )
    })

    it('returns an error when invalid form data for contract type provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()

        const client = await sharedTestPrismaClient()
        const draftContractInsert = mockInsertContractArgs({})
        const newRate = must(
            await insertDraftContract(client, draftContractInsert)
        )
        // use type coercion to pass in bad data
        const updatedRate = await updateDraftContract(client, {
            contractID: newRate.id,
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'NOT_REAL' as ContractType,
            },
        })

        // Expect a prisma error
        expect(updatedRate).toBeInstanceOf(PrismaClientValidationError)
    })

    it('returns an error when invalid contract ID provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()

        const client = await sharedTestPrismaClient()

        const draftContract = await updateDraftContract(client, {
            contractID: 'not-real-id',
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'AMENDMENT',
            },
        })

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })
})
