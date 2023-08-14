import type { InsertContractArgsType } from '../../postgres/contractAndRates/insertContract'
import type { State } from '@prisma/client'
import { must } from '../errorHelpers'
import type { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import type {
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
} from '../../postgres/contractAndRates/prismaDraftContractHelpers'
import type {
    ContractRevisionTableWithRates,
    ContractTableWithRelations,
} from '../../postgres/contractAndRates/prismaSubmittedContractHelpers'
import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import type { ContractFormEditable } from '../../postgres/contractAndRates/updateDraftContract'

const createInsertContractData = ({
    stateCode,
    ...formData
}: {
    stateCode?: StateCodeType
} & Partial<ContractFormEditable>): InsertContractArgsType => {
    return {
        stateCode: stateCode ?? 'MN',
        submissionType: formData?.submissionType ?? 'CONTRACT_AND_RATES',
        submissionDescription:
            formData?.submissionDescription ?? 'Contract 1.0',
        contractType: formData?.contractType ?? 'BASE',
        programIDs: formData?.programIDs ?? ['PMAP'],
        populationCovered: formData?.populationCovered ?? 'MEDICAID',
        riskBasedContract: formData?.riskBasedContract ?? false,
    }
}

const getStateRecord = async (
    client: PrismaClient,
    stateCode: string
): Promise<State> => {
    const state = must(
        await client.state.findFirst({
            where: {
                stateCode,
            },
        })
    )

    if (!state) {
        throw new Error('Unexpected prisma error: state record not found')
    }

    return state
}

const createDraftContractData = (
    contract?: Partial<DraftContractTableWithRelations>
): DraftContractTableWithRelations => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'FL',
    stateNumber: 111,
    revisions: contract?.revisions ?? [
        createContractRevision({
            rateRevisions: undefined,
            submitInfo: null,
        }) as DraftContractRevisionTableWithRelations,
    ],
    ...contract,
})

const createContractData = (
    contract?: Partial<ContractTableWithRelations>
): ContractTableWithRelations => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'FL',
    stateNumber: 111,
    revisions: contract?.revisions ?? [
        createContractRevision({
            draftRates: undefined,
        }) as ContractRevisionTableWithRates,
    ],
    ...contract,
})

const createContractRevision = (
    revision?: Partial<
        ContractRevisionTableWithRates | DraftContractRevisionTableWithRelations
    >
):
    | ContractRevisionTableWithRates
    | DraftContractRevisionTableWithRelations => ({
    id: uuidv4(),
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
            stateCode: 'OH',
        },
    },
    unlockInfo: null,
    contractID: 'contractID',
    submitInfoID: null,
    unlockInfoID: null,
    programIDs: ['Program'],
    populationCovered: 'MEDICAID' as const,
    submissionType: 'CONTRACT_ONLY' as const,
    riskBasedContract: false,
    submissionDescription: 'Test',
    stateContacts: [],
    supportingDocuments: [
        {
            id: uuidv4(),
            contractRevisionID: 'contractRevisionID',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: 'contract supporting doc',
            s3URL: 'fakeS3URL',
            sha256: '2342fwlkdmwvw',
        },
        {
            id: uuidv4(),
            contractRevisionID: 'contractRevisionID',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: 'contract supporting doc 2',
            s3URL: 'fakeS3URL',
            sha256: '45662342fwlkdmwvw',
        },
    ],
    contractType: 'BASE',
    contractExecutionStatus: 'EXECUTED',
    contractDocuments: [
        {
            id: uuidv4(),
            contractRevisionID: 'contractRevisionID',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: 'contract doc',
            s3URL: 'fakeS3URL',
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
    rateRevisions: [],
    draftRates: [],
    ...revision,
})

export {
    createInsertContractData,
    getStateRecord,
    createContractRevision,
    createContractData,
    createDraftContractData,
}
