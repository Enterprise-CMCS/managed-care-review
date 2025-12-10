import {
    validateContractDraftRevisionInput,
    parseContract,
    parseEQROContract,
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
import {
    defaultFloridaProgram,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'

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
            dsnpContract: null,
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
            dsnpContract: undefined,
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
            contractSubmissionType: 'HEALTH_PLAN',
            reviewStatus: 'UNDER_REVIEW',
            consolidatedStatus: 'DRAFT',
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
                    contractSubmissionType: 'HEALTH_PLAN',
                },
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    programIDs: [defaultFloridaProgram().id],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    dsnpContract: true,
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
                    stateContacts: [
                        {
                            name: 'Someone',
                            email: 'someone@example.com',
                            titleRole: 'sometitle',
                        },
                    ],
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
                    reviewStatus: 'UNDER_REVIEW',
                    consolidatedStatus: 'DRAFT',
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
                            rateCertificationName: 'fake-name',
                            rateMedicaidPopulations: ['MEDICAID_ONLY'],
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
                            rateProgramIDs: [defaultFloridaRateProgram().id],
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
                dsnp: true,
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
            id: '6ab1b4c0-f9d2-4567-958a-3123e98328e1',
            stateCode: 'MN',
            stateNumber: 5,
            contractSubmissionType: 'HEALTH_PLAN',
            mccrsID: undefined,
            reviewStatus: 'UNDER_REVIEW',
            consolidatedStatus: 'DRAFT',
            revisions: [],
            draftRevision: {
                id: '6ab1b4c0-f9d2-4567-958a-3123e98328e2',
                submitInfo: undefined,
                unlockInfo: undefined,
                contract: {
                    id: '6ab1b4c0-f9d2-4567-958a-3123e98328e1',
                    stateCode: 'MN',
                    stateNumber: 4,
                    contractSubmissionType: 'HEALTH_PLAN',
                },
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    programIDs: ['fake-id'],
                    populationCovered: 'CHIP',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    dsnpContract: true,
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
                    id: '6ab1b4c0-f9d2-4567-958a-3123e98328e3',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'DRAFT',
                    stateCode: 'FL',
                    stateNumber: 5,
                    consolidatedStatus: 'DRAFT',
                    reviewStatus: 'UNDER_REVIEW',
                    parentContractID: '6ab1b4c0-f9d2-4567-958a-3123e98328e8',
                    packageSubmissions: [],
                    draftRevision: {
                        id: '6ab1b4c0-f9d2-4567-958a-3123e98328e4',
                        rateID: '6ab1b4c0-f9d2-4567-958a-3123e98328e6',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        submitInfo: undefined,
                        unlockInfo: undefined,
                        formData: {
                            rateType: 'AMENDMENT',
                            rateCapitationType: 'RATE_CELL',
                            rateCertificationName: 'fake-rate-name',
                            rateMedicaidPopulations: [],
                            rateDocuments: [
                                {
                                    s3URL: 'foobar//foobar',
                                    sha256: 'shafake',
                                    name: 'rate doc',
                                },
                            ],
                            supportingDocuments: [],
                            rateDateStart: new Date('2020-02-02'),
                            rateDateEnd: new Date('2021-02-02'),
                            rateDateCertified: new Date(),
                            // amendmentEffectiveDateStart: new Date('2020-02-05'),
                            // amendmentEffectiveDateEnd: new Date('2020-02-04'),
                            amendmentEffectiveDateStart: undefined,
                            amendmentEffectiveDateEnd: undefined,
                            rateProgramIDs: ['fakerateprogramid'],
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
                dsnp: true,
            }
        )
        if (!(parsedContract instanceof Error)) {
            throw new Error(
                'Unexpected error: Was expecting validateContractDraftRevisionInput to return and error'
            )
        }
        expect(parsedContract.issues).toHaveLength(6)
        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'Too small: expected array to have >=1 items'
        )
        expect(errMessages[1]).toContain(
            'Too small: expected array to have >=1 items'
        )
        expect(errMessages[2]).toContain(
            'cannot submit rates with CHIP only populationCovered'
        )
        expect(errMessages[3]).toContain(
            'statutoryRegulatoryAttestationDescription is required when 438-attestation feature flag is on'
        )
        expect(errMessages[4]).toContain(
            'rateMedicaidPopulations is required when dsnpContract is true'
        )
        expect(errMessages[5]).toContain(
            'Program(s) in [fake-id,fakerateprogramid] are not valid FL programs'
        )
    })
    it('return error if dnspContract is required but not populated', async () => {
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
            contractSubmissionType: 'HEALTH_PLAN',
            reviewStatus: 'UNDER_REVIEW',
            consolidatedStatus: 'DRAFT',
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
                    contractSubmissionType: 'HEALTH_PLAN',
                },
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    programIDs: [defaultFloridaProgram().id],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    dsnpContract: undefined,
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
                    stateContacts: [
                        {
                            name: 'Someone',
                            email: 'someone@example.com',
                            titleRole: 'sometitle',
                        },
                    ],
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
                    reviewStatus: 'UNDER_REVIEW',
                    consolidatedStatus: 'DRAFT',
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
                            rateCertificationName: 'fake-name',
                            rateMedicaidPopulations: [],
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
                            rateProgramIDs: [defaultFloridaRateProgram().id],
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
                dsnp: true,
            }
        )
        if (!(parsedContract instanceof Error)) {
            throw new Error(
                'Unexpected error: Was expecting validateContractDraftRevisionInput to return and error'
            )
        }
        expect(parsedContract.issues).toHaveLength(1)
        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'dsnpContract is required when any of the following Federal Authorities are present: STATE_PLAN,WAIVER_1915B,WAIVER_1115,VOLUNTARY'
        )
    })
})

describe('parseEQROContract', () => {
    const createValidEQROContract = (): ContractType => {
        return {
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date(),
            id: '28b00852-00e3-467c-9311-519e60d43283',
            stateCode: 'FL',
            stateNumber: 5,
            contractSubmissionType: 'EQRO',
            reviewStatus: 'UNDER_REVIEW',
            consolidatedStatus: 'DRAFT',
            mccrsID: undefined,
            revisions: [],
            draftRevision: {
                id: 'e5bccaa3-d91c-499a-9f2f-c6ce8dbf8a5f',
                submitInfo: undefined,
                unlockInfo: undefined,
                contract: {
                    id: '88a54ccd-a36d-494d-a386-8ecf8b7438e6',
                    stateCode: 'FL',
                    stateNumber: 4,
                    contractSubmissionType: 'EQRO',
                },
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    programIDs: [defaultFloridaProgram().id],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_ONLY',
                    submissionDescription: 'A real EQRO submission',
                    supportingDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractsupporting1',
                            sha256: 'fakesha',
                            name: 'contractSupporting1',
                            dateAdded: new Date('01/15/2024'),
                            downloadURL: s3DlUrl,
                        },
                    ],
                    stateContacts: [
                        {
                            name: 'Someone',
                            email: 'someone@example.com',
                            titleRole: 'sometitle',
                        },
                    ],
                    contractType: 'BASE',
                    contractDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractdoc1',
                            sha256: 'fakesha',
                            name: 'contractDoc1',
                            dateAdded: new Date('01/15/2024'),
                            downloadURL: s3DlUrl,
                        },
                    ],
                    contractDateStart: new Date('2025-01-01'),
                    contractDateEnd: new Date('2026-01-01'),
                    managedCareEntities: ['MCO'],
                    federalAuthorities: [],
                    // EQRO-specific fields for BASE + MEDICAID + MCO
                    eqroNewContractor: true,
                    eqroProvisionMcoNewOptionalActivity: true,
                    eqroProvisionNewMcoEqrRelatedActivities: true,
                },
            },
            draftRates: [],
            packageSubmissions: [],
        }
    }

    it('should succeed if valid EQRO contract', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        expect(parsedContract).toEqual(contract)
    })

    it('should return an error if EQRO contract has rates', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Add a rate to the contract (should fail)
        contract.draftRates = [
            {
                id: '6ab1b4c0-f9d2-4567-958a-3123e98328eb',
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'DRAFT',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'DRAFT',
                stateCode: 'FL',
                stateNumber: 5,
                parentContractID: contract.id,
                packageSubmissions: [],
                draftRevision: {
                    id: '6c7862a2-f3a1-4171-9fdd-6a8c9c2dd24b',
                    rateID: '6ab1b4c0-f9d2-4567-958a-3123e98328eb',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    submitInfo: undefined,
                    unlockInfo: undefined,
                    formData: {
                        rateType: 'NEW',
                        rateCapitationType: 'RATE_CELL',
                        rateCertificationName: 'fake-name',
                        rateMedicaidPopulations: ['MEDICAID_ONLY'],
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/ratedoc',
                                sha256: 'fakesha',
                                name: 'rateDoc',
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date('2025-01-01'),
                        rateDateEnd: new Date('2026-01-01'),
                        rateDateCertified: new Date(),
                        rateProgramIDs: [defaultFloridaRateProgram().id],
                        deprecatedRateProgramIDs: [],
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact',
                                titleRole: 'Test Actuary',
                                email: 'actuary@test.com',
                            },
                        ],
                        addtlActuaryContacts: [],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [],
                    },
                },
                revisions: [],
            },
        ]

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'EQRO submissions must be contract only and not include any rates'
        )
    })

    it('should return an error if submissionType is not CONTRACT_ONLY', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Change submission type (should fail schema validation)
        contract.draftRevision!.formData.submissionType = 'CONTRACT_AND_RATES'

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'Invalid input: expected "CONTRACT_ONLY"'
        )
    })

    it('should return an error if BASE + MEDICAID + MCO missing required EQRO fields', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Remove required EQRO fields
        contract.draftRevision!.formData.eqroNewContractor = undefined
        contract.draftRevision!.formData.eqroProvisionMcoNewOptionalActivity =
            undefined
        contract.draftRevision!.formData.eqroProvisionNewMcoEqrRelatedActivities =
            undefined

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'is required for BASE contracts with MEDICAID population & MCO entity'
        )
    })

    it('should return an error if BASE + CHIP + MCO missing required EQRO fields', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Change to CHIP population
        contract.draftRevision!.formData.populationCovered = 'CHIP'
        // CHIP + MCO requires all these fields
        contract.draftRevision!.formData.eqroNewContractor = undefined
        contract.draftRevision!.formData.eqroProvisionMcoNewOptionalActivity =
            undefined
        contract.draftRevision!.formData.eqroProvisionNewMcoEqrRelatedActivities =
            undefined
        contract.draftRevision!.formData.eqroProvisionChipEqrRelatedActivities =
            undefined

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'BASE contracts with CHIP population & MCO entity'
        )
    })

    it('should return an error if BASE + CHIP + no MCO missing required EQRO fields', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Change to CHIP population and remove MCO
        contract.draftRevision!.formData.populationCovered = 'CHIP'
        contract.draftRevision!.formData.managedCareEntities = ['PIHP']
        contract.draftRevision!.formData.eqroProvisionChipEqrRelatedActivities =
            undefined

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'eqroProvisionChipEqrRelatedActivities is required for BASE contracts with CHIP population & no MCO entity'
        )
    })

    it('should return an error if AMENDMENT + CHIP + MCO missing required EQRO fields', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Change to AMENDMENT with CHIP + MCO
        contract.draftRevision!.formData.contractType = 'AMENDMENT'
        contract.draftRevision!.formData.populationCovered = 'MEDICAID_AND_CHIP'
        contract.draftRevision!.formData.eqroProvisionMcoEqrOrRelatedActivities =
            undefined
        contract.draftRevision!.formData.eqroProvisionChipEqrRelatedActivities =
            undefined

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'AMENDMENT contracts with CHIP population & MCO entity'
        )
    })

    it('should return an error if AMENDMENT + conditional fields missing', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // AMENDMENT with MEDICAID + MCO
        contract.draftRevision!.formData.contractType = 'AMENDMENT'
        contract.draftRevision!.formData.populationCovered = 'MEDICAID'
        // When eqroProvisionMcoEqrOrRelatedActivities is true, additional fields are required
        contract.draftRevision!.formData.eqroProvisionMcoEqrOrRelatedActivities =
            true
        contract.draftRevision!.formData.eqroProvisionMcoNewOptionalActivity =
            undefined
        contract.draftRevision!.formData.eqroProvisionNewMcoEqrRelatedActivities =
            undefined

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'eqroProvisionMcoNewOptionalActivity is required for AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
        )
    })

    it('should return an error if invalid program IDs', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Add invalid program ID
        contract.draftRevision!.formData.programIDs = [
            'fake-program-id',
            'another-fake-id',
        ]

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (!(parsedContract instanceof Error)) {
            throw new Error('Expected parseEQROContract to return an error')
        }

        const errMessages = parsedContract.issues.map((err) => err.message)
        expect(errMessages[0]).toContain(
            'Program(s) in [fake-program-id,another-fake-id] are not valid FL programs'
        )
    })

    it('should succeed with optional fields omitted', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const contract = createValidEQROContract()

        // Ensure optional fields are not set
        contract.draftRevision!.formData.federalAuthorities = []
        contract.draftRevision!.formData.riskBasedContract = undefined
        contract.draftRevision!.formData.contractExecutionStatus = undefined
        contract.draftRevision!.formData.modifiedBenefitsProvided = undefined
        contract.draftRevision!.formData.modifiedGeoAreaServed = undefined
        contract.draftRevision!.formData.modifiedRiskSharingStrategy = undefined

        const parsedContract = parseEQROContract(
            contract,
            stateCode,
            postgresStore
        )

        if (parsedContract instanceof Error) {
            throw new Error(
                `Expected parseEQROContract to succeed but got error: ${parsedContract.message}`
            )
        }

        expect(parsedContract).toEqual(contract)
    })
})
