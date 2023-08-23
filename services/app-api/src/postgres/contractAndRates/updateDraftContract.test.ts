import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { createInsertContractData, must } from '../../testHelpers'
import type { ContractFormEditable } from './updateDraftContract'
import { updateDraftContract } from './updateDraftContract'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'
import type { ContractType } from '@prisma/client'

describe('updateDraftContract', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('updates drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1 = createInsertContractData({})
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
                rateIDs: [],
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.submissionDescription).toBe(
            'something else'
        )
    })

    it('updates linked documents as expected in multiple requests', async () => {
        const client = await sharedTestPrismaClient()

        const draftRateForm1: ContractFormEditable = {
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
        const draftRateForm2: ContractFormEditable = {
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
        const draftRateForm3: ContractFormEditable = {
            submissionDescription: 'draftData3',
            contractDocuments: draftRateForm2.contractDocuments,
            supportingDocuments: draftRateForm1.supportingDocuments,
        }

        const contract = must(
            await insertDraftContract(client, createInsertContractData({}))
        )

        const draft1 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftRateForm1,
                rateIDs: [],
            })
        )

        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)
        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)

        const draft2 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftRateForm2,
                rateIDs: [],
            })
        )

        expect(draft2.draftRevision?.formData.submissionDescription).toBe(
            'draftData2'
        )

        expect(draft2.draftRevision?.formData.contractDocuments).toEqual(
            draftRateForm2.contractDocuments
        )
        expect(draft2.draftRevision?.formData.supportingDocuments).toEqual(
            draftRateForm2.supportingDocuments
        )

        const draft3 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftRateForm3,
                rateIDs: [],
            })
        )
        expect(draft3.draftRevision?.formData.submissionDescription).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.supportingDocuments).toHaveLength(
            1
        )
        expect(draft3.draftRevision?.formData.contractDocuments).toEqual(
            draftRateForm3.contractDocuments
        )
        expect(draft3.draftRevision?.formData.supportingDocuments).toEqual(
            draftRateForm3.supportingDocuments
        )
    })

    it('updates linked contacts as expected in multiple requests', async () => {
        const client = await sharedTestPrismaClient()
        const draftRateForm1: ContractFormEditable = {
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
        const draftRateForm2: ContractFormEditable = {
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
        const draftRateForm3: ContractFormEditable = {
            submissionDescription: 'draftData3',
            stateContacts: draftRateForm2.stateContacts,
        }

        const contract = must(
            await insertDraftContract(client, createInsertContractData({}))
        )

        const draft1 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftRateForm1,
                rateIDs: [],
            })
        )

        expect(draft1.draftRevision?.formData.stateContacts).toHaveLength(1)

        const draft2 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftRateForm2,
                rateIDs: [],
            })
        )

        expect(draft2.draftRevision?.formData.submissionDescription).toBe(
            'draftData2'
        )
        expect(draft2.draftRevision?.formData.stateContacts).toEqual(
            draftRateForm2.stateContacts
        )

        const draft3 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftRateForm3,
                rateIDs: [],
            })
        )
        expect(draft3.draftRevision?.formData.submissionDescription).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.stateContacts).toEqual(
            draftRateForm3.stateContacts
        )
    })

    it('returns an error when invalid form data for contract type provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()

        const client = await sharedTestPrismaClient()
        const draftContractInsert = createInsertContractData({})
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
            rateIDs: [],
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
            rateIDs: [],
        })

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })
})
