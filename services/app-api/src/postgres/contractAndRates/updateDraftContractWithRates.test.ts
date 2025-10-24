import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import {
    clearDocMetadata,
    mockInsertContractArgs,
    must,
    mockInsertRateArgs,
} from '../../testHelpers'
import { updateDraftContractFormData } from './updateDraftContractWithRates'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'
import type { ContractType } from '@prisma/client'
import type {
    ContractFormDataType,
    RateFormEditableType,
    ContractFormEditableType,
} from '../../domain-models/contractAndRates'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftRate } from './insertRate'
import { updateDraftContractRates } from './updateDraftContractRates'
import { getDraftContractRateRevisions } from '../../domain-models'

describe('updateDraftContractWithRates postgres', () => {
    afterEach(() => {
        vi.clearAllMocks()
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
            await updateDraftContractFormData(client, {
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

    function completeTestRate(): RateFormEditableType {
        return {
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDocuments: [
                {
                    name: 'rate doc',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: '8984234fwlkdmwvw',
                },
            ],
            supportingDocuments: [
                {
                    name: 'rate sup doc',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: '8984234fwlkdmwvw',
                },
            ],
            rateDateStart: new Date(Date.UTC(2025, 5, 1)),
            rateDateEnd: new Date(Date.UTC(2026, 5, 1)),
            rateDateCertified: new Date(Date.UTC(2025, 5, 1)),
            amendmentEffectiveDateStart: new Date(Date.UTC(2025, 5, 1)),
            amendmentEffectiveDateEnd: new Date(Date.UTC(2025, 5, 1)),
            rateProgramIDs: ['5904a736-4422-4b78-abef-f3df3d0ae21d'],
            rateCertificationName: 'fake name',
            certifyingActuaryContacts: [
                {
                    name: 'Foo Person',
                    email: 'foo@example.com',
                    titleRole: 'Foo Role',
                },
            ],
            addtlActuaryContacts: [
                {
                    name: 'Foo Person',
                    email: 'foo@example.com',
                    titleRole: 'Foo Role',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            // packagesWithSharedRateCerts: ['something'],
        }
    }

    it('allows for removing all fields', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1 = mockInsertContractArgs({})
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        const fullContract = completeTestContract()
        must(
            await updateDraftContractFormData(client, {
                contractID: contract.id,
                formData: fullContract,
            })
        )

        const draft = must(
            await updateDraftContractRates(client, {
                contractID: contract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: completeTestRate(),
                            ratePosition: 1,
                        },
                    ],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.submissionDescription).toBe('Test')

        const rateID = draft.draftRates?.[0].id

        if (!rateID) {
            throw new Error(
                'Unexpected error: No rate was found on draft contract'
            )
        }

        const emptyContract = emptyTestContract()

        must(
            await updateDraftContractFormData(client, {
                contractID: contract.id,
                formData: emptyContract,
            })
        )

        const emptyDraft = must(
            await updateDraftContractRates(client, {
                contractID: contract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: { id: rateID },
                            ratePosition: 1,
                        },
                    ],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        expect(emptyDraft.draftRevision).toBeDefined()
        expect(
            emptyDraft.draftRevision?.formData.modifiedBenefitsProvided
        ).toBeUndefined()
        expect(emptyDraft.draftRevision?.formData.federalAuthorities).toEqual(
            []
        )

        expect(
            getDraftContractRateRevisions(emptyDraft)[0].formData.rateDateStart
        ).toBeUndefined()
        expect(
            getDraftContractRateRevisions(emptyDraft)[0].formData.rateProgramIDs
        ).toEqual([])
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
            await updateDraftContractFormData(client, {
                contractID: contract.id,
                formData: draftContractForm1,
            })
        )

        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)
        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)

        const draft2 = must(
            await updateDraftContractFormData(client, {
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
            await updateDraftContractFormData(client, {
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
            await updateDraftContractFormData(client, {
                contractID: contract.id,
                formData: draftContractForm1,
            })
        )

        expect(draft1.draftRevision?.formData.stateContacts).toHaveLength(1)

        const draft2 = must(
            await updateDraftContractFormData(client, {
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
            await updateDraftContractFormData(client, {
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
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const client = await sharedTestPrismaClient()
        const draftContractInsert = mockInsertContractArgs({})
        const newRate = must(
            await insertDraftContract(client, draftContractInsert)
        )
        // use type coercion to pass in bad data
        const updatedRate = await updateDraftContractFormData(client, {
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
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const client = await sharedTestPrismaClient()

        const draftContract = await updateDraftContractFormData(client, {
            contractID: 'not-real-id',
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'AMENDMENT',
            },
        })

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })

    it('create, update, and disconnects many rates', async () => {
        // Make a new contract
        const client = await sharedTestPrismaClient()
        const draftContractFormData = mockInsertContractArgs({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        // Update contract with new rates
        must(
            await updateDraftContractFormData(client, {
                contractID: draftContract.id,
                formData: {},
            })
        )

        const updatedContractWithNewRates = must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: mockInsertRateArgs({
                                rateType: 'NEW',
                            }),
                            ratePosition: 1,
                        },
                        {
                            formData: mockInsertRateArgs({
                                rateType: 'AMENDMENT',
                            }),
                            ratePosition: 2,
                        },
                        {
                            formData: mockInsertRateArgs({
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                            }),
                            ratePosition: 3,
                        },
                    ],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        if (!updatedContractWithNewRates.draftRevision) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        const newlyCreatedRates = getDraftContractRateRevisions(
            updatedContractWithNewRates
        )

        // Expect 3 rates
        expect(newlyCreatedRates).toHaveLength(3)

        // Array of the current rates, but now with updates
        const updateRateRevisionData: RateFormEditableType[] = [
            {
                ...newlyCreatedRates[0].formData,
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 1',
                        titleRole: 'Title',
                        email: 'statecontact1@example.com',
                        actuarialFirm: 'MERCER',
                    },
                ],
            },
            {
                ...newlyCreatedRates[1].formData,
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 2 Doc',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'someShaForRateDoc2',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 8, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 7, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 2',
                        titleRole: 'Title',
                        email: 'statecontact2@example.com',
                        actuarialFirm: 'MILLIMAN',
                    },
                ],
            },
            {
                ...newlyCreatedRates[2].formData,
                rateDocuments: [
                    {
                        name: 'Rate 3 Doc',
                        s3URL: 's3://bucketname/key/test1',
                        sha256: 'someShaForRateDoc3',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 3, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 4, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 3',
                        titleRole: 'Title',
                        email: 'statecontact3@example.com',
                        actuarialFirmOther: 'Some other actuary firm',
                    },
                ],
            },
        ]

        // Update many rates in the contract
        must(
            await updateDraftContractFormData(client, {
                contractID: updatedContractWithNewRates.id,
                formData: {},
            })
        )

        const updatedContractRates = must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [],
                    update: [
                        {
                            rateID: newlyCreatedRates[0].rateID,
                            formData: updateRateRevisionData[0],
                            ratePosition: 1,
                        },
                        {
                            rateID: newlyCreatedRates[1].rateID,
                            formData: updateRateRevisionData[1],
                            ratePosition: 2,
                        },
                        {
                            rateID: newlyCreatedRates[2].rateID,
                            formData: updateRateRevisionData[2],
                            ratePosition: 3,
                        },
                    ],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        if (updatedContractRates.draftRevision === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        const updatedRateRevisions =
            getDraftContractRateRevisions(updatedContractRates)

        // expect three updated rates
        expect(updatedRateRevisions).toHaveLength(3)

        // expect rate data to match what we defined in the updates
        expect(updatedRateRevisions).toEqual(
            expect.arrayContaining([
                // expect updated rate revisions to have our defined rate revision data from updateRateRevisionData
                expect.objectContaining({
                    ...updatedRateRevisions[0],
                    formData: expect.objectContaining({
                        ...updatedRateRevisions[0].formData,
                        ...updateRateRevisionData[0],
                        rateDocuments: clearDocMetadata(
                            updatedRateRevisions[0].formData.rateDocuments
                        ),
                        supportingDocuments: clearDocMetadata(
                            updatedRateRevisions[0].formData.supportingDocuments
                        ),
                    }),
                }),
                expect.objectContaining({
                    ...updatedRateRevisions[1],
                    formData: expect.objectContaining({
                        ...updatedRateRevisions[1].formData,
                        ...updateRateRevisionData[1],
                        rateDocuments: clearDocMetadata(
                            updatedRateRevisions[1].formData.rateDocuments
                        ),
                        supportingDocuments: clearDocMetadata(
                            updatedRateRevisions[1].formData.supportingDocuments
                        ),
                    }),
                }),
                expect.objectContaining({
                    ...updatedRateRevisions[2],
                    formData: expect.objectContaining({
                        ...updatedRateRevisions[2].formData,
                        ...updateRateRevisionData[2],
                        rateDocuments: clearDocMetadata(
                            updatedRateRevisions[2].formData.rateDocuments
                        ),
                        supportingDocuments: clearDocMetadata(
                            updatedRateRevisions[2].formData.supportingDocuments
                        ),
                    }),
                }),
            ])
        )

        // Disconnect many rates in the contract

        // lets make sure we have rate ids
        if (
            !updatedRateRevisions[0].formData ||
            !updatedRateRevisions[1].formData ||
            !updatedRateRevisions[2].formData
        ) {
            throw new Error(
                'Unexpected error. Rate revisions did not contain rate IDs'
            )
        }

        // disconnect rate 3
        const contractAfterRateDisconnection = must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [],
                    update: [
                        {
                            rateID: updatedRateRevisions[0].rateID,
                            formData: updatedRateRevisions[0].formData,
                            ratePosition: 1,
                        },
                        {
                            rateID: updatedRateRevisions[1].rateID,
                            formData: updatedRateRevisions[1].formData,
                            ratePosition: 2,
                        },
                    ],
                    link: [],
                    unlink: [
                        {
                            rateID: updatedRateRevisions[2].rateID,
                        },
                    ],
                    delete: [],
                },
            })
        )

        // expect two rate revisions
        expect(
            getDraftContractRateRevisions(contractAfterRateDisconnection)
        ).toHaveLength(2)

        if (!contractAfterRateDisconnection.draftRates) {
            throw new Error('draft should have drafts')
        }

        // Create, Update and Disconnect many contracts
        const contractAfterManyCrud = must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: mockInsertRateArgs({
                                id: uuidv4(),
                                rateType: 'NEW',
                                certifyingActuaryContacts: [
                                    {
                                        name: 'New Contact',
                                        titleRole: 'Title',
                                        email: 'newstatecontact@example.com',
                                        actuarialFirmOther: 'New firm',
                                    },
                                ],
                            }),
                            ratePosition: 2,
                        },
                        {
                            formData: mockInsertRateArgs({
                                id: uuidv4(),
                                rateType: 'AMENDMENT',
                                certifyingActuaryContacts: [
                                    {
                                        name: 'New Contact 2',
                                        titleRole: 'Title',
                                        email: 'newstatecontact2@example.com',
                                        actuarialFirmOther: 'New firm 2',
                                    },
                                ],
                            }),
                            ratePosition: 3,
                        },
                    ],
                    update: [
                        {
                            rateID: contractAfterRateDisconnection.draftRates[0]
                                .id,
                            formData: {
                                ...getDraftContractRateRevisions(
                                    contractAfterRateDisconnection
                                )[0].formData,
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Actuary Contact 1 Last update',
                                        titleRole: 'Title',
                                        email: 'statecontact1@example.com',
                                        actuarialFirm: 'MERCER',
                                    },
                                ],
                            },
                            ratePosition: 1,
                        },
                    ],
                    link: [],
                    unlink: [
                        {
                            rateID: updatedRateRevisions[1].rateID,
                        },
                    ],
                    delete: [],
                },
            })
        )

        if (contractAfterManyCrud.draftRevision === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        const rateRevisionsAfterManyCrud = getDraftContractRateRevisions(
            contractAfterManyCrud
        )

        // should expect 3 rates
        expect(rateRevisionsAfterManyCrud).toHaveLength(3)

        // expect rates to have correct data
        expect(rateRevisionsAfterManyCrud).toEqual(
            expect.arrayContaining([
                // expect our first rate to the existing rate we updated
                expect.objectContaining({
                    ...rateRevisionsAfterManyCrud[0],
                    formData: {
                        ...rateRevisionsAfterManyCrud[0].formData,
                        certifyingActuaryContacts: [
                            {
                                name: 'Actuary Contact 1 Last update',
                                titleRole: 'Title',
                                email: 'statecontact1@example.com',
                                actuarialFirm: 'MERCER',
                            },
                        ],
                    },
                }),
                // expect our second and third rate to be the new rates
                expect.objectContaining({
                    ...rateRevisionsAfterManyCrud[1],
                    formData: {
                        ...rateRevisionsAfterManyCrud[1].formData,
                        rateType: 'NEW',
                        certifyingActuaryContacts: [
                            {
                                name: 'New Contact',
                                titleRole: 'Title',
                                email: 'newstatecontact@example.com',
                                actuarialFirmOther: 'New firm',
                            },
                        ],
                    },
                }),
                expect.objectContaining({
                    ...rateRevisionsAfterManyCrud[2],
                    formData: {
                        ...rateRevisionsAfterManyCrud[2].formData,
                        rateType: 'AMENDMENT',
                        certifyingActuaryContacts: [
                            {
                                name: 'New Contact 2',
                                titleRole: 'Title',
                                email: 'newstatecontact2@example.com',
                                actuarialFirmOther: 'New firm 2',
                            },
                        ],
                    },
                }),
            ])
        )
    })

    it('connects existing rates to contract', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractFormData = mockInsertContractArgs({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        // new draft rate
        const draftRate = must(
            await insertDraftRate(
                client,
                draftContract.id,
                mockInsertRateArgs({
                    rateType: 'NEW',
                    stateCode: 'MN',
                })
            )
        )

        if (!draftRate.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        // get state data
        const previousStateData = must(
            await client.state.findFirst({
                where: {
                    stateCode: draftContract.stateCode,
                },
            })
        )

        if (!previousStateData) {
            throw new Error('Unexpected error: Cannot find state record')
        }

        const mockDraftRate = mockInsertRateArgs({
            id: uuidv4(),
            rateType: 'NEW',
            stateCode: 'MN',
        })

        // update draft contract with rates
        const updatedDraftContract = must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: mockDraftRate,
                            ratePosition: 2,
                        },
                    ],
                    update: [],
                    link: [
                        {
                            rateID: draftRate.id,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        // expect two rates connected to contract
        expect(
            getDraftContractRateRevisions(updatedDraftContract)
        ).toHaveLength(2)
    })
})
