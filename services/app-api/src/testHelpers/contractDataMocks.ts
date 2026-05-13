import { v4 as uuidv4 } from 'uuid'
import type {
    ContractRevisionTableWithRates,
    ContractTableFullPayload,
} from '../postgres/contractAndRates/prismaFullContractRateHelpers'
import type { StateCodeType } from '@mc-review/submissions'
import type {
    ContractFormDataType,
    ContractSubmissionType,
    ContractType,
} from '../domain-models'
import { findStatePrograms, type InsertContractArgsType } from '../postgres'
import { must } from './assertionHelpers'
import { s3DlUrl } from './documentHelpers'

const defaultContractData = () => ({
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    mccrsID: null,
    stateCode: 'MN',
    stateNumber: 111,
    contractSubmissionType: 'HEALTH_PLAN' as const,
})

const mockInsertContractArgs = ({
    stateCode = 'MN',
    contractSubmissionType = 'HEALTH_PLAN',
    ...formData
}: {
    stateCode?: StateCodeType
    contractSubmissionType?: ContractSubmissionType
} & Partial<ContractFormDataType>): InsertContractArgsType => {
    const statePrograms = must(findStatePrograms(stateCode))

    return {
        contractSubmissionType: contractSubmissionType,
        stateCode: stateCode,
        submissionType: formData?.submissionType ?? 'CONTRACT_AND_RATES',
        submissionDescription:
            formData?.submissionDescription ?? 'Contract 1.0',
        contractType: formData?.contractType ?? 'BASE',
        programIDs: formData?.programIDs ?? [statePrograms[0].id],
        populationCovered: formData?.populationCovered ?? 'MEDICAID',
        riskBasedContract: formData?.riskBasedContract ?? false,
        ...formData,
    }
}

const mockContractRevision = (
    contract?: Partial<ContractTableFullPayload>,
    revision?: Partial<ContractRevisionTableWithRates>,
    stateCode: StateCodeType = 'MN'
): ContractRevisionTableWithRates => {
    const statePrograms = must(findStatePrograms(stateCode))

    return {
        id: uuidv4(),
        contract: {
            ...defaultContractData(),
            ...contract,
        },
        relatedSubmisions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        submitInfo: {
            id: uuidv4(),
            updatedAt: new Date(),
            updatedByID: 'someone',
            updatedReason: 'submit',
            updatedBy: {
                id: 'someone',
                createdAt: new Date(),
                updatedAt: new Date(),
                givenName: 'Bob',
                familyName: 'Law',
                email: 'boblaw@example.com',
                role: 'STATE_USER',
                divisionAssignment: null,
                stateCode: stateCode,
            },
        },
        dsnpContract: null,
        unlockInfo: null,
        undoUnlockInfo: null,
        contractID: 'contractID',
        submitInfoID: null,
        unlockInfoID: null,
        undoUnlockInfoID: null,
        programIDs: [statePrograms[0].id],
        populationCovered: 'MEDICAID' as const,
        submissionType: 'CONTRACT_ONLY' as const,
        riskBasedContract: false,
        submissionDescription: 'Test',
        stateContacts: [],
        supportingDocuments: [
            {
                id: uuidv4(),
                position: 0,
                contractRevisionID: 'contractRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'contract supporting doc',
                s3URL: 's3://bucketname/key/test1',
                s3BucketName: 'bucketname',
                s3Key: 'key/test1',
                sha256: '2342fwlkdmwvw',
                dateAdded: new Date(),
            },
            {
                id: uuidv4(),
                position: 1,
                contractRevisionID: 'contractRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'contract supporting doc 2',
                s3URL: 's3://bucketname/key/test1',
                s3BucketName: 'bucketname',
                s3Key: 'key/test1',
                sha256: '45662342fwlkdmwvw',
                dateAdded: new Date(),
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                id: uuidv4(),
                position: 0,
                contractRevisionID: 'contractRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'contract doc',
                s3URL: 's3://bucketname/key/test1',
                s3BucketName: 'bucketname',
                s3Key: 'key/test1',
                sha256: '8984234fwlkdmwvw',
                dateAdded: new Date(),
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
        modifiedNonRiskPaymentArrangements: null,
        inLieuServicesAndSettings: null,
        statutoryRegulatoryAttestation: null,
        statutoryRegulatoryAttestationDescription: null,
        eqroNewContractor: null,
        eqroProvisionChipEqrRelatedActivities: null,
        eqroProvisionMcoNewOptionalActivity: null,
        eqroProvisionMcoEqrOrRelatedActivities: null,
        eqroProvisionNewMcoEqrRelatedActivities: null,
        ...revision,
    }
}

// Minimal-but-fully-submittable KY HEALTH_PLAN draft ContractType for parseContract tests.
// Uses real UUIDs and sets every submittableContractFormDataSchema-required field.
const mockSubmittableHealthPlanContract = (opts?: {
    contractID?: string
    stateNumber?: number
    programIDs?: string[]
    rateProgramIDs?: string[]
}): ContractType => {
    const activeKYProgram = must(findStatePrograms('KY')).find(
        (p) => !p.isDeprecated
    )
    if (!activeKYProgram) {
        throw new Error(
            'Test setup error: expected KY to have at least one active program in statePrograms.json'
        )
    }
    const contractID =
        opts?.contractID ?? '28b00852-00e3-467c-9311-519e60d43283'
    const stateNumber = opts?.stateNumber ?? 5
    return {
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: contractID,
        stateCode: 'KY',
        stateNumber,
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
                id: contractID,
                stateCode: 'KY',
                stateNumber,
                contractSubmissionType: 'HEALTH_PLAN',
            },
            createdAt: new Date('2023-11-27'),
            updatedAt: new Date('2023-11-27'),
            formData: {
                programIDs: opts?.programIDs ?? [activeKYProgram.id],
                populationCovered: 'MEDICAID',
                submissionType: 'CONTRACT_AND_RATES',
                riskBasedContract: true,
                dsnpContract: true,
                submissionDescription: 'A real submission',
                supportingDocuments: [],
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
                        s3URL: 's3://bucketname/key/contract',
                        sha256: 'fakesha',
                        name: 'contract',
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
                statutoryRegulatoryAttestationDescription: 'valid description',
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
                stateCode: 'KY',
                stateNumber,
                parentContractID: contractID,
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
                                s3URL: 's3://bucketname/key/rate',
                                sha256: 'fakesha',
                                name: 'rate',
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
                        rateProgramIDs: opts?.rateProgramIDs ?? [
                            activeKYProgram.id,
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
}

export {
    mockInsertContractArgs,
    mockContractRevision,
    mockSubmittableHealthPlanContract,
}
