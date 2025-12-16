import {
    validateContractDraftRevisionInput,
    parseContract,
    parseAndUpdateEqroFields,
    parseEQROContract,
} from './dataValidatorHelpers'
import {
    mockGqlContractDraftRevisionFormDataInput,
    must,
} from '../../testHelpers'
import type {
    ContractDraftRevisionFormDataInput,
    ContractFormData,
} from '../../gen/gqlClient'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { NewPostgresStore } from '../../postgres'
import type { ContractType } from './contractTypes'
import { s3DlUrl } from '../../testHelpers/documentHelpers'
import {
    defaultFloridaProgram,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'
import type {
    ContractFormDataType,
    UpdateDraftContractFormDataType,
} from './formDataTypes'
import { eqroValidationAndReviewDetermination } from '@mc-review/submissions'

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

describe('parseAndUpdateEqroFields', () => {
    const ALL_EQRO_FIELDS = [
        'eqroNewContractor',
        'eqroProvisionMcoEqrOrRelatedActivities',
        'eqroProvisionMcoNewOptionalActivity',
        'eqroProvisionNewMcoEqrRelatedActivities',
        'eqroProvisionChipEqrRelatedActivities',
    ] as const

    const defaultEqroValues = {
        eqroNewContractor: true,
        eqroProvisionMcoEqrOrRelatedActivities: true,
        eqroProvisionMcoNewOptionalActivity: true,
        eqroProvisionNewMcoEqrRelatedActivities: true,
        eqroProvisionChipEqrRelatedActivities: true,
    }

    const baseCurrentFormData = (
        overrides?: Partial<ContractFormDataType>
    ): ContractFormDataType => ({
        programIDs: ['program-1'],
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'Test submission',
        contractType: 'BASE',
        populationCovered: 'MEDICAID',
        riskBasedContract: false,
        stateContacts: [],
        supportingDocuments: [],
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date('2024-01-01'),
        contractDateEnd: new Date('2024-12-31'),
        managedCareEntities: ['MCO'],
        federalAuthorities: [],
        ...defaultEqroValues,
        ...overrides,
    })

    const baseUpdateFormData = (
        overrides?: Partial<UpdateDraftContractFormDataType>
    ): UpdateDraftContractFormDataType => ({
        contractType: 'BASE',
        populationCovered: 'MEDICAID',
        managedCareEntities: ['MCO'],
        ...defaultEqroValues,
        ...overrides,
    })

    describe('when triggering questions have not changed', () => {
        it('returns form data unchanged', () => {
            const currentFormData = baseCurrentFormData()
            const updateFormData = baseUpdateFormData()

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBe(true)
            })
        })
    })

    describe('when contract type changes', () => {
        it('nullifies all EQRO fields', () => {
            const currentFormData = baseCurrentFormData({
                contractType: 'BASE',
            })
            const updateFormData = baseUpdateFormData({
                contractType: 'AMENDMENT',
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })
    })

    describe('when population covered changes', () => {
        it('nullifies all EQRO fields when changing from MEDICAID to MEDICAID_AND_CHIP', () => {
            const currentFormData = baseCurrentFormData({
                populationCovered: 'MEDICAID',
            })
            const updateFormData = baseUpdateFormData({
                populationCovered: 'MEDICAID_AND_CHIP',
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })

        it('nullifies all EQRO fields when changing from CHIP to MEDICAID', () => {
            const currentFormData = baseCurrentFormData({
                populationCovered: 'CHIP',
            })
            const updateFormData = baseUpdateFormData({
                populationCovered: 'MEDICAID',
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })

        it('nullifies all EQRO fields when changing from MEDICAID_AND_CHIP to MEDICAID', () => {
            const currentFormData = baseCurrentFormData({
                populationCovered: 'MEDICAID_AND_CHIP',
            })
            const updateFormData = baseUpdateFormData({
                populationCovered: 'MEDICAID',
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })

        it('does not nullify fields when changing from CHIP to MEDICAID_AND_CHIP', () => {
            const currentFormData = baseCurrentFormData({
                populationCovered: 'CHIP',
            })
            const updateFormData = baseUpdateFormData({
                populationCovered: 'MEDICAID_AND_CHIP',
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBe(true)
            })
        })

        it('does not nullify fields when changing from MEDICAID_AND_CHIP to CHIP', () => {
            const currentFormData = baseCurrentFormData({
                populationCovered: 'MEDICAID_AND_CHIP',
            })
            const updateFormData = baseUpdateFormData({
                populationCovered: 'CHIP',
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBe(true)
            })
        })
    })

    describe('when managed care entities changes', () => {
        it('nullifies all EQRO fields when MCO is added', () => {
            const currentFormData = baseCurrentFormData({
                managedCareEntities: ['PIHP'],
            })
            const updateFormData = baseUpdateFormData({
                managedCareEntities: ['PIHP', 'MCO'],
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })

        it('nullifies all EQRO fields when MCO is removed', () => {
            const currentFormData = baseCurrentFormData({
                managedCareEntities: ['MCO'],
            })
            const updateFormData = baseUpdateFormData({
                managedCareEntities: ['PIHP'],
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })

        it('does not nullify fields when entities are only reordered', () => {
            const currentFormData = baseCurrentFormData({
                managedCareEntities: ['MCO', 'PIHP'],
            })
            const updateFormData = baseUpdateFormData({
                managedCareEntities: ['PIHP', 'MCO', 'PCCM'],
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBe(true)
            })
        })
    })

    describe('when multiple triggering questions change', () => {
        it('nullifies all EQRO fields', () => {
            const currentFormData = baseCurrentFormData({
                contractType: 'BASE',
                populationCovered: 'MEDICAID',
                managedCareEntities: ['MCO'],
            })
            const updateFormData = baseUpdateFormData({
                contractType: 'AMENDMENT',
                populationCovered: 'CHIP',
                managedCareEntities: ['PIHP'],
            })

            const result = parseAndUpdateEqroFields(
                currentFormData,
                updateFormData
            )

            ALL_EQRO_FIELDS.forEach((field) => {
                expect(result[field]).toBeNull()
            })
        })
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
        expect(errMessages[0]).toContain('EQRO submission cannot contain rates')
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

describe('eqroValidationAndReviewDetermination', () => {
    const defaultFormData = (
        overrides?: Partial<ContractFormData>
    ): ContractFormData => ({
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'], //MN state program
        populationCovered: 'MEDICAID_AND_CHIP',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'Test',
        stateContacts: [
            {
                name: 'test name',
                email: 'test@example.com',
                titleRole: 'title',
            },
        ],
        supportingDocuments: [
            {
                s3URL: 's3://bucketname/key/contractsupporting1.pdf',
                sha256: 'fakesha',
                name: 'contractSupporting1.pdf',
            },
        ],
        contractType: 'BASE',
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/contract.pdf',
                sha256: 'fakesha',
                name: 'contract.pdf',
            },
        ],
        contractDateStart: '2024-05-04',
        contractDateEnd: '2025-05-04',
        managedCareEntities: ['MCO'],
        federalAuthorities: [],
        eqroNewContractor: true,
        eqroProvisionMcoNewOptionalActivity: true,
        eqroProvisionNewMcoEqrRelatedActivities: false,
        eqroProvisionChipEqrRelatedActivities: null,
        eqroProvisionMcoEqrOrRelatedActivities: null,
        ...overrides,
    })

    const eqroBaseContractTestData: {
        formData: ContractFormData
        testDescription: string
        expectedResult: boolean
    }[] = [
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'MEDICAID_AND_CHIP',
                managedCareEntities: ['MCO'],
                eqroNewContractor: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
                eqroProvisionChipEqrRelatedActivities: false,
            },
            expectedResult: true,
            testDescription:
                'Subject to review when three of three review questions answered yes.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'MEDICAID',
                managedCareEntities: ['MCO'],
                eqroNewContractor: false,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: true,
            },
            expectedResult: true,
            testDescription:
                'Subject to review when one of three review questions answered yes.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'CHIP',
                managedCareEntities: ['MCO'],
                eqroNewContractor: false,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: false,
                eqroProvisionChipEqrRelatedActivities: true,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when none of the review questions are answered yes.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'CHIP',
                managedCareEntities: ['PAHP'],
                eqroProvisionChipEqrRelatedActivities: true,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when none of the review questions are applicable.',
        },
    ]

    it.each(eqroBaseContractTestData)(
        'Base contract $testDescription',
        ({ formData, expectedResult }) => {
            expect(
                eqroValidationAndReviewDetermination('test-id', formData)
            ).toBe(expectedResult)
        }
    )

    const eqroAmendmentContractTestData: {
        formData: ContractFormData
        testDescription: string
        expectedResult: boolean
    }[] = [
        {
            formData: {
                ...defaultFormData(),
                contractType: 'AMENDMENT',
                populationCovered: 'MEDICAID_AND_CHIP',
                managedCareEntities: ['MCO'],
                eqroProvisionMcoEqrOrRelatedActivities: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
                eqroProvisionChipEqrRelatedActivities: false,
            },
            expectedResult: true,
            testDescription:
                'Subject to review when both review questions are answered yes.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'AMENDMENT',
                populationCovered: 'MEDICAID',
                managedCareEntities: ['MCO'],
                eqroProvisionMcoEqrOrRelatedActivities: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: false,
                eqroProvisionChipEqrRelatedActivities: false,
            },
            expectedResult: true,
            testDescription:
                'Subject to review when one of two review questions are answered yes.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'AMENDMENT',
                populationCovered: 'MEDICAID_AND_CHIP',
                managedCareEntities: ['MCO'],
                eqroProvisionMcoEqrOrRelatedActivities: false,
                eqroProvisionMcoNewOptionalActivity: null,
                eqroProvisionNewMcoEqrRelatedActivities: null,
                eqroProvisionChipEqrRelatedActivities: false,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when triggering question is answered no.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'AMENDMENT',
                populationCovered: 'MEDICAID_AND_CHIP',
                managedCareEntities: ['MCO'],
                eqroProvisionMcoEqrOrRelatedActivities: true,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: false,
                eqroProvisionChipEqrRelatedActivities: false,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when none of review questions are answered yes',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'AMENDMENT',
                populationCovered: 'MEDICAID_AND_CHIP',
                managedCareEntities: ['PAHP'],
                eqroProvisionChipEqrRelatedActivities: false,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when review questions are not applicable',
        },
    ]

    it.each(eqroAmendmentContractTestData)(
        'Amendment contract $testDescription',
        ({ formData, expectedResult }) => {
            expect(
                eqroValidationAndReviewDetermination('test-id', formData)
            ).toBe(expectedResult)
        }
    )
})
