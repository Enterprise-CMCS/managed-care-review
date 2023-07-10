import { UpdateInfoType } from '../../domain-models'
import { RateRevision } from './rateType'
import {
    ActuaryCommunicationType,
    ContractExecutionStatus,
    ContractType,
    PopulationCoveredType,
    StateContact,
    SubmissionDocument,
    SubmissionType,
    FederalAuthority,
    ActuaryContact,
} from 'app-web/src/common-code/healthPlanFormDataType'

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
interface Contract {
    id: string
    status: 'DRAFT' | 'SUBMITTED'
    stateCode: string
    stateNumber: number
    revisions: ContractRevision[]
}

// ContractRevision has all the information in a single submission of this contract.
// If a revision has been submitted it will have submitInfo (otherwise it will be a draft)
// if a revision was unlocked, it will have unlock info, otherwise it was an initial submission
// The set of rateRevisions hold exactly what rate data was present at the time this contract was submitted.
type ContractRevision = {
    id: string
    unlockInfo?: UpdateInfoType
    submitInfo?: UpdateInfoType
    createdAt: Date
    updatedAt: Date
    formData: ContractFormData
    rateRevisions: RateRevision[]
}

type ContractFormData = {
    programIDs: string[]
    populationCovered?: PopulationCoveredType
    submissionType: SubmissionType
    riskBasedContract?: boolean
    submissionDescription?: string
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    addtlActuaryCommunicationPreference?: ActuaryCommunicationType
    supportingDocuments: SubmissionDocument[]
    contractType?: ContractType
    contractExecutionStatus?: ContractExecutionStatus
    contractDocuments: SubmissionDocument[]
    contractDateStart?: Date
    contractDateEnd?: Date
    managedCareEntities?: string[]
    federalAuthorities: FederalAuthority[]
    modifiedBenefitsProvided?: boolean
    modifiedGeoAreaServed?: boolean
    modifiedMedicaidBeneficiaries?: boolean
    modifiedRiskSharingStrategy?: boolean
    modifiedIncentiveArrangements?: boolean
    modifiedWitholdAgreements?: boolean
    modifiedStateDirectedPayments?: boolean
    modifiedPassThroughPayments?: boolean
    modifiedPaymentsForMentalDiseaseInstitutions?: boolean
    modifiedMedicalLossRatioStandards?: boolean
    modifiedOtherFinancialPaymentIncentive?: boolean
    modifiedEnrollmentProcess?: boolean
    modifiedGrevienceAndAppeal?: boolean
    modifiedNetworkAdequacyStandards?: boolean
    modifiedLengthOfContract?: boolean
    modifiedNonRiskPaymentArrangements?: boolean
    inLieuServicesAndSettings?: boolean
}

export type { Contract, ContractRevision, ContractFormData }
