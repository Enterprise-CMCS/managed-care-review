import type { InsertContractArgsType } from '../postgres/contractAndRates/insertContract'
import { v4 as uuidv4 } from 'uuid'
import type {
    ContractRevisionTableWithRates,
    ContractTableFullPayload,
} from '../postgres/contractAndRates/prismaFullContractRateHelpers'
import type { StateCodeType } from '../common-code/healthPlanFormDataType'
import type { ContractFormDataType } from '../domain-models/contractAndRates'
import { findStatePrograms } from '../postgres'
import { must } from './assertionHelpers'

const defaultContractData = () => ({
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    mccrsID: null,
    stateCode: 'MN',
    stateNumber: 111,
})

const mockInsertContractArgs = ({
    stateCode = 'MN',
    ...formData
}: {
    stateCode?: StateCodeType
} & Partial<ContractFormDataType>): InsertContractArgsType => {
    const statePrograms = must(findStatePrograms(stateCode))

    return {
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

const mockContractData = (
    contract?: Partial<ContractTableFullPayload>
): ContractTableFullPayload => {
    const contractData = {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        mccrsID: null,
        stateCode: 'MN',
        stateNumber: 111,
        draftRates: [],
        revisions: [],
        ...contract,
    }

    Object.assign(contractData, {
        revisions: contract?.revisions ?? [
            mockContractRevision({
                ...contractData,
                ...contract,
            }) as ContractRevisionTableWithRates,
        ],
    })

    return contractData
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
        unlockInfo: null,
        contractID: 'contractID',
        submitInfoID: null,
        unlockInfoID: null,
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
                sha256: '2342fwlkdmwvw',
            },
            {
                id: uuidv4(),
                position: 1,
                contractRevisionID: 'contractRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'contract supporting doc 2',
                s3URL: 's3://bucketname/key/test1',
                sha256: '45662342fwlkdmwvw',
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
        modifiedNonRiskPaymentArrangements: null,
        inLieuServicesAndSettings: null,
        statutoryRegulatoryAttestation: null,
        statutoryRegulatoryAttestationDescription: null,
        ...revision,
    }
}

export { mockInsertContractArgs, mockContractRevision, mockContractData }
