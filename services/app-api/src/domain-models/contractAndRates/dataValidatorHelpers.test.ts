import {
    validateContractDraftRevisionInput,
    parseContract,
} from './dataValidatorHelpers'
import {
    mockGqlContractDraftRevisionFormDataInput,
    must,
} from '../../testHelpers'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { NewPostgresStore } from '../../postgres'
import type { ContractType } from './contractTypes'
import { s3DlUrl } from '../../testHelpers/documentHelpers'

describe('validateContractDraftRevisionInput', () => {
    it('Validates input form data and removes statutoryRegulatoryAttestationDescription', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const formData = {
            ...mockGqlContractDraftRevisionFormDataInput(stateCode),
            contractDateStart: new Date(2025, 5, 1),
            contractDateEnd: new Date(2026, 4, 30),
            statutoryRegulatoryAttestation: true,
            statutoryRegulatoryAttestationDescription:
                'Hi, I should be gone after validation.',
            stateContacts: [
                {
                    name: 'Bill',
                    titleRole: 'A Title',
                    email: '', // Accepts empty string because users can save as draft with incomplete data.
                },
            ],
        }

        const expectedResult = {
            ...formData,
            statutoryRegulatoryAttestation: true,
            statutoryRegulatoryAttestationDescription: undefined,
        }

        const validatedFormData = must(
            validateContractDraftRevisionInput(
                formData,
                stateCode,
                postgresStore,
                {
                    '438-attestation': true,
                }
            )
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('converts fields that are null to undefined', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const formData = {
            ...mockGqlContractDraftRevisionFormDataInput(stateCode),
            stateContacts: [
                {
                    name: 'Bill',
                    titleRole: 'A Title',
                    email: '', // Accepts empty string because users can save as draft with incomplete data.
                },
            ],
            submissionDescription: null,
            contractType: null,
            riskBasedContract: null,
            contractDateStart: null,
            contractDateEnd: null,
            contractExecutionStatus: null,
            inLieuServicesAndSettings: null,
            modifiedBenefitsProvided: null,
            modifiedGeoAreaServed: null,
            modifiedMedicaidBeneficiaries: null,
            modifiedRiskSharingStrategy: null,
            modifiedIncentiveArrangements: null,
            modifiedWitholdAgreements: null,
            modifiedStateDirectedPayments: null,
            modifiedPassThroughPayments: null,
            modifiedPaymentsForMentalDiseaseInstitutions: null,
            modifiedMedicalLossRatioStandards: null,
            modifiedOtherFinancialPaymentIncentive: null,
            modifiedEnrollmentProcess: null,
            modifiedGrevienceAndAppeal: null,
            modifiedNetworkAdequacyStandards: null,
            modifiedLengthOfContract: null,
            modifiedNonRiskPaymentArrangements: null,
            statutoryRegulatoryAttestation: null,
            statutoryRegulatoryAttestationDescription: null,
        }

        const expectedResult = {
            ...formData,
            submissionDescription: undefined,
            contractType: undefined,
            riskBasedContract: undefined,
            contractDateStart: undefined,
            contractDateEnd: undefined,
            contractExecutionStatus: undefined,
            inLieuServicesAndSettings: undefined,
            modifiedBenefitsProvided: undefined,
            modifiedGeoAreaServed: undefined,
            modifiedMedicaidBeneficiaries: undefined,
            modifiedRiskSharingStrategy: undefined,
            modifiedIncentiveArrangements: undefined,
            modifiedWitholdAgreements: undefined,
            modifiedStateDirectedPayments: undefined,
            modifiedPassThroughPayments: undefined,
            modifiedPaymentsForMentalDiseaseInstitutions: undefined,
            modifiedMedicalLossRatioStandards: undefined,
            modifiedOtherFinancialPaymentIncentive: undefined,
            modifiedEnrollmentProcess: undefined,
            modifiedGrevienceAndAppeal: undefined,
            modifiedNetworkAdequacyStandards: undefined,
            modifiedLengthOfContract: undefined,
            modifiedNonRiskPaymentArrangements: undefined,
            statutoryRegulatoryAttestation: undefined,
            statutoryRegulatoryAttestationDescription: undefined,
        }

        const validatedFormData = must(
            validateContractDraftRevisionInput(
                formData,
                stateCode,
                postgresStore,
                {
                    '438-attestation': true,
                }
            )
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('Returns error for invalid data', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const formData: ContractDraftRevisionFormDataInput = {
            ...mockGqlContractDraftRevisionFormDataInput(stateCode),
            contractDateStart: new Date(2025, 5, 1),
            contractDateEnd: new Date(2026, 4, 30),
            statutoryRegulatoryAttestation: false,
            statutoryRegulatoryAttestationDescription: undefined,
            stateContacts: [
                {
                    name: 'Bill',
                    titleRole: 'A Title',
                    email: 'abc123@gmail',
                },
            ],
            programIDs: [
                'imNotAValidProgramID',
                '83d0e9d9-6592-439a-b46c-3235e8192fa0',
            ],
            submissionType: 'CONTRACT_AND_RATES',
            populationCovered: 'CHIP',
        }

        const validatedFormData = validateContractDraftRevisionInput(
            formData,
            stateCode,
            postgresStore,
            { '438-attestation': true }
        )

        if (!(validatedFormData instanceof Error)) {
            throw new Error(
                'Unexpected error: Was expecting validateContractDraftRevisionInput to return and error'
            )
        }

        expect(validatedFormData.message).toContain('Invalid email')
        expect(validatedFormData.message).toContain(
            `Program(s) in [${formData.programIDs}] are not valid ${stateCode} programs`
        )
        expect(validatedFormData.message).toContain(
            `populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES`
        )
    })
})

describe('parseContract', () => {
    it('success if valid form data', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract: ContractType = {
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date(),
            id: '28b00852-00e3-467c-9311-519e60d43283',
            stateCode: 'FL',
            stateNumber: 5,
            mccrsID: undefined,
            revisions: [],
            draftRevision: {
                id: 'e5bccaa3-d91c-499a-9f2f-c6ce8dbf8a5f',
                submitInfo: undefined,
                unlockInfo: undefined,
                contract: {
                    id: '88a54ccd-a36d-494d-a386-8ecf8b7438e6',
                    stateCode: 'MN',
                    stateNumber: 4,
                },
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    programIDs: ['83d0e9d9-6592-439a-b46c-3235e8192fa0'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    submissionDescription: 'A real submission',
                    supportingDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractsupporting1',
                            sha256: 'fakesha',
                            name: 'contractSupporting1',
                            dateAdded: new Date('01/15/2024'),
                            downloadURL: s3DlUrl,
                        },
                        {
                            s3URL: 's3://bucketname/key/contractSupporting2',
                            sha256: 'fakesha',
                            name: 'contractSupporting2',
                            dateAdded: new Date('01/13/2024'),
                            downloadURL: s3DlUrl,
                        },
                    ],
                    stateContacts: [],
                    contractType: 'AMENDMENT',
                    contractExecutionStatus: 'EXECUTED',
                    contractDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractsupporting1',
                            sha256: 'fakesha',
                            name: 'contractSupporting1',
                            dateAdded: new Date('01/15/2024'),
                            downloadURL: s3DlUrl,
                        },
                    ],
                    contractDateStart: new Date(),
                    contractDateEnd: new Date(),
                    managedCareEntities: ['MCO'],
                    federalAuthorities: ['STATE_PLAN'],
                    inLieuServicesAndSettings: true,
                    modifiedBenefitsProvided: true,
                    modifiedGeoAreaServed: false,
                    modifiedMedicaidBeneficiaries: true,
                    modifiedRiskSharingStrategy: true,
                    modifiedIncentiveArrangements: false,
                    modifiedWitholdAgreements: false,
                    modifiedStateDirectedPayments: true,
                    modifiedPassThroughPayments: true,
                    modifiedPaymentsForMentalDiseaseInstitutions: false,
                    modifiedMedicalLossRatioStandards: true,
                    modifiedOtherFinancialPaymentIncentive: false,
                    modifiedEnrollmentProcess: true,
                    modifiedGrevienceAndAppeal: false,
                    modifiedNetworkAdequacyStandards: true,
                    modifiedLengthOfContract: false,
                    modifiedNonRiskPaymentArrangements: true,
                    statutoryRegulatoryAttestation: true,
                    statutoryRegulatoryAttestationDescription:
                        'valid description',
                },
            },
            draftRates: [
                {
                    id: '6ab1b4c0-f9d2-4567-958a-3123e98328eb',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'DRAFT',
                    stateCode: 'FL',
                    stateNumber: 5,
                    parentContractID: 'cb9a1ecb-cdb6-4ef2-956d-3fba8776cd8b',
                    packageSubmissions: [],
                    draftRevision: {
                        id: '6c7862a2-f3a1-4171-9fdd-6a8c9c2dd24b',
                        rateID: '6ab1b4c0-f9d2-4567-958a-3123e98328eb',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        submitInfo: undefined,
                        unlockInfo: undefined,
                        formData: {
                            rateType: 'AMENDMENT',
                            rateCapitationType: 'RATE_CELL',
                            rateDocuments: [
                                {
                                    s3URL: 's3://bucketname/key/contractsupporting1',
                                    sha256: 'fakesha',
                                    name: 'contractSupporting1',
                                    dateAdded: new Date('01/15/2024'),
                                    downloadURL: s3DlUrl,
                                },
                            ],
                            supportingDocuments: [],
                            rateDateStart: new Date('2020-02-02'),
                            rateDateEnd: new Date('2021-02-02'),
                            rateDateCertified: new Date(),
                            amendmentEffectiveDateStart: new Date('1/1/2023'),
                            amendmentEffectiveDateEnd: new Date('1/1/2024'),
                            rateProgramIDs: [
                                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                            ],
                            deprecatedRateProgramIDs: [],
                            certifyingActuaryContacts: [
                                {
                                    actuarialFirm: 'DELOITTE',
                                    name: 'Actuary Contact 1',
                                    titleRole: 'Test Actuary Contact 1',
                                    email: 'actuarycontact1@test.com',
                                },
                            ],
                            addtlActuaryContacts: [
                                {
                                    actuarialFirm: 'DELOITTE',
                                    name: 'Actuary Contact 1',
                                    titleRole: 'Test Actuary Contact 1',
                                    email: 'additionalactuarycontact1@test.com',
                                },
                            ],
                            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                            packagesWithSharedRateCerts: [],
                        },
                    },
                    revisions: [],
                },
            ],
            packageSubmissions: [],
        }
        const parsedContract = parseContract(
            contract,
            stateCode,
            postgresStore,
            {
                '438-attestation': true,
            }
        )

        expect(parsedContract).toEqual(contract)
    })

    it('return error if invalid form data', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract: ContractType = {
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date(),
            id: 'test-abc-123',
            stateCode: 'MN',
            stateNumber: 5,
            mccrsID: undefined,
            revisions: [],
            draftRevision: {
                id: '12345',
                submitInfo: undefined,
                unlockInfo: undefined,
                contract: {
                    id: '123',
                    stateCode: 'MN',
                    stateNumber: 4,
                },
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    programIDs: ['fake-id'],
                    populationCovered: 'CHIP',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    submissionDescription: 'A real submission',
                    supportingDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractsupporting1',
                            sha256: 'fakesha',
                            name: 'contractSupporting1',
                            dateAdded: new Date('01/15/2024'),
                            downloadURL: s3DlUrl,
                        },
                        {
                            s3URL: 's3://bucketname/key/contractSupporting2',
                            sha256: 'fakesha',
                            name: 'contractSupporting2',
                            dateAdded: new Date('01/13/2024'),
                            downloadURL: s3DlUrl,
                        },
                    ],
                    stateContacts: [],
                    contractType: 'AMENDMENT',
                    contractExecutionStatus: 'EXECUTED',
                    contractDocuments: [],
                    contractDateStart: new Date(),
                    contractDateEnd: new Date(),
                    managedCareEntities: ['MCO'],
                    federalAuthorities: ['STATE_PLAN'],
                    inLieuServicesAndSettings: true,
                    modifiedBenefitsProvided: true,
                    modifiedGeoAreaServed: false,
                    modifiedMedicaidBeneficiaries: true,
                    modifiedRiskSharingStrategy: true,
                    modifiedIncentiveArrangements: false,
                    modifiedWitholdAgreements: false,
                    modifiedStateDirectedPayments: true,
                    modifiedPassThroughPayments: true,
                    modifiedPaymentsForMentalDiseaseInstitutions: false,
                    modifiedMedicalLossRatioStandards: true,
                    modifiedOtherFinancialPaymentIncentive: false,
                    modifiedEnrollmentProcess: true,
                    modifiedGrevienceAndAppeal: false,
                    modifiedNetworkAdequacyStandards: true,
                    modifiedLengthOfContract: false,
                    modifiedNonRiskPaymentArrangements: true,
                    statutoryRegulatoryAttestation: undefined,
                    statutoryRegulatoryAttestationDescription: undefined,
                },
            },
            draftRates: [
                {
                    id: 'rate-123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'DRAFT',
                    stateCode: 'FL',
                    stateNumber: 5,
                    parentContractID: 'some-other-contract-id',
                    packageSubmissions: [],
                    draftRevision: {
                        id: '123',
                        rateID: 'rate-123',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        submitInfo: undefined,
                        unlockInfo: undefined,
                        formData: {
                            rateType: 'AMENDMENT',
                            rateCapitationType: 'RATE_CELL',
                            rateDocuments: [],
                            supportingDocuments: [],
                            rateDateStart: new Date('2020-02-02'),
                            rateDateEnd: new Date('2021-02-02'),
                            rateDateCertified: new Date(),
                            amendmentEffectiveDateStart: undefined,
                            amendmentEffectiveDateEnd: undefined,
                            rateProgramIDs: [
                                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                            ],
                            deprecatedRateProgramIDs: [],
                            certifyingActuaryContacts: [
                                {
                                    actuarialFirm: 'DELOITTE',
                                    name: 'Actuary Contact 1',
                                    titleRole: 'Test Actuary Contact 1',
                                    email: 'actuarycontact1@test.com',
                                },
                            ],
                            addtlActuaryContacts: [
                                {
                                    actuarialFirm: 'DELOITTE',
                                    name: 'Actuary Contact 1',
                                    titleRole: 'Test Actuary Contact 1',
                                    email: 'additionalactuarycontact1@test.com',
                                },
                            ],
                            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                            packagesWithSharedRateCerts: [],
                        },
                    },
                    revisions: [
                        {
                            id: '456',
                            rateID: 'rate-123',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            submitInfo: undefined,
                            unlockInfo: undefined,
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDocuments: [
                                    {
                                        s3URL: 's3://bucketname/key/rate',
                                        sha256: 'fakesha',
                                        name: 'rate',
                                        dateAdded: new Date(),
                                    },
                                ],
                                supportingDocuments: [],
                                rateDateStart: new Date('2020-01-01'),
                                rateDateEnd: new Date('2021-01-01'),
                                rateDateCertified: new Date(),
                                amendmentEffectiveDateStart: new Date(),
                                amendmentEffectiveDateEnd: new Date(),
                                rateProgramIDs: [
                                    'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                                ],
                                deprecatedRateProgramIDs: [],
                                certifyingActuaryContacts: [
                                    {
                                        actuarialFirm: 'DELOITTE',
                                        name: 'Actuary Contact 1',
                                        titleRole: 'Test Actuary Contact 1',
                                        email: 'actuarycontact1@test.com',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        actuarialFirm: 'DELOITTE',
                                        name: 'Actuary Contact 1',
                                        titleRole: 'Test Actuary Contact 1',
                                        email: 'additionalactuarycontact1@test.com',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                                packagesWithSharedRateCerts: [],
                            },
                        },
                    ],
                },
            ],
            packageSubmissions: [],
        }
        const parsedContract = parseContract(
            contract,
            stateCode,
            postgresStore,
            {
                '438-attestation': true,
            }
        )
        if (!(parsedContract instanceof Error)) {
            throw new Error(
                'Unexpected error: Was expecting validateContractDraftRevisionInput to return and error'
            )
        }

        expect(parsedContract.message).toContain(
            `populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES`
        )
        // expect(parsedContract.message).toContain(
        //         `statutoryRegulatoryAttestationDescription is required when  438-attestation feature flag is on`
        //     )
        expect(parsedContract.message).toContain(
            `Program(s) in [fake-id] are not valid FL programs`
        )
        expect(parsedContract.message).toContain(
            `amendmentEffectiveDateStart is required if rateType is AMENDMENT`
        )
        expect(parsedContract.message).toContain(
            `amendmentEffectiveDateEnd is required if rateType is AMENDMENT`
        )
        expect(parsedContract.message).toContain(
            `Array must contain at least 1 element(s)`
        )
    })
})
