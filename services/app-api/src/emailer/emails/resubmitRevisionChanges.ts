import { formatCalendarDate } from '@mc-review/dates'
import {
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
} from '@mc-review/submissions'
import {
    type ContractType,
    type ProgramType,
    type RevisionDiff,
    type RevisionDiffFieldChange,
} from '../../domain-models'

type ResubmitRevisionChangeRow = {
    label: string
    newValue: string
    oldValue?: string
    isNew?: boolean
    breakBeforeNewValue?: boolean
}

type ResubmitRevisionChangeSection = {
    title: string
    rows: ResubmitRevisionChangeRow[]
}

type ResubmitRevisionChanges = {
    previousSubmissionDate: string
    currentSubmissionDate: string
    hasChanges: boolean
    sections: ResubmitRevisionChangeSection[]
}

const EMAIL_TIMEZONE = 'America/Los_Angeles'

type SubmissionTypeFieldPath =
    | 'contractName'
    | 'populationCovered'
    | 'submissionType'
    | 'contractType'
    | 'riskBasedContract'
    | 'programIDs'
    | 'submissionDescription'

type ContractDetailsFieldPath =
    | 'contractExecutionStatus'
    | 'contractDateStart'
    | 'contractDateEnd'
    | 'managedCareEntities'
    | 'federalAuthorities'
    | 'dsnpContract'

type ContractProvisionsFieldPath =
    | 'inLieuServicesAndSettings'
    | 'modifiedBenefitsProvided'
    | 'modifiedGeoAreaServed'
    | 'modifiedMedicaidBeneficiaries'
    | 'modifiedRiskSharingStrategy'
    | 'modifiedIncentiveArrangements'
    | 'modifiedWitholdAgreements'
    | 'modifiedStateDirectedPayments'
    | 'modifiedPassThroughPayments'
    | 'modifiedMedicalLossRatioStandards'
    | 'modifiedOtherFinancialPaymentIncentive'
    | 'modifiedGrevienceAndAppeal'
    | 'modifiedNetworkAdequacyStandards'
    | 'modifiedLengthOfContract'
    | 'modifiedNonRiskPaymentArrangements'
    | 'modifiedPaymentsForMentalDiseaseInstitutions'

type SubmissionTypeValue = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'
type PopulationCoveredValue = 'MEDICAID' | 'CHIP' | 'MEDICAID_AND_CHIP'
type ContractActionTypeValue = 'BASE' | 'AMENDMENT'
type ContractExecutionStatusValue = 'EXECUTED' | 'UNEXECUTED'
type ManagedCareEntityValue = 'MCO' | 'PIHP' | 'PAHP' | 'PCCM'
type FederalAuthorityValue =
    | 'STATE_PLAN'
    | 'WAIVER_1915B'
    | 'WAIVER_1115'
    | 'VOLUNTARY'
    | 'BENCHMARK'
    | 'TITLE_XXI'

const isChipOnlyContract = (contract: ContractType): boolean =>
    contract.packageSubmissions[0]?.contractRevision.formData
        .populationCovered === 'CHIP'

const submissionTypeValueRecord: Record<SubmissionTypeValue, string> = {
    CONTRACT_ONLY: 'Contract only',
    CONTRACT_AND_RATES: 'Contract and rate(s)',
}

const populationCoveredValueRecord: Record<PopulationCoveredValue, string> = {
    MEDICAID: 'Medicaid',
    CHIP: 'CHIP',
    MEDICAID_AND_CHIP: 'Medicaid and CHIP',
}

const contractActionTypeValueRecord: Record<ContractActionTypeValue, string> = {
    BASE: 'Base',
    AMENDMENT: 'Amendment',
}

const formatBooleanValue = (value: unknown): string | undefined => {
    if (value === true) {
        return 'Yes'
    }

    if (value === false) {
        return 'No'
    }

    return undefined
}

const formatProgramsValue = (
    value: unknown,
    statePrograms: ProgramType[]
): string | undefined => {
    if (!Array.isArray(value)) {
        return undefined
    }

    const names = value
        .map((programID) =>
            statePrograms.find((program) => program.id === String(programID))
        )
        .filter((program): program is ProgramType => Boolean(program))
        .map((program) => program.name)

    return names.length > 0 ? names.join(', ') : undefined
}

const formatStringArrayValue = <
    TValue extends string,
    TDictionary extends Record<TValue, string>,
>(
    value: unknown,
    dictionary: TDictionary
): string | undefined => {
    if (!Array.isArray(value)) {
        return undefined
    }

    const displayValues = value
        .map((item) => dictionary[item as TValue])
        .filter(Boolean)

    return displayValues.length > 0 ? displayValues.join(', ') : undefined
}

const formatManagedCareEntitiesValue = (value: unknown): string | undefined => {
    if (!Array.isArray(value)) {
        return undefined
    }

    const displayValues = value.filter(
        (item): item is ManagedCareEntityValue =>
            item === 'MCO' ||
            item === 'PIHP' ||
            item === 'PAHP' ||
            item === 'PCCM'
    )

    return displayValues.length > 0 ? displayValues.join(', ') : undefined
}

const formatDateValue = (value: unknown): string | undefined => {
    if (!(value instanceof Date)) {
        return undefined
    }

    return formatCalendarDate(value, 'UTC')
}

const formatFieldValue = (
    fieldPath:
        | SubmissionTypeFieldPath
        | ContractDetailsFieldPath
        | ContractProvisionsFieldPath,
    value: unknown,
    statePrograms: ProgramType[]
): string | undefined => {
    if (typeof value === 'string') {
        if (fieldPath === 'contractName') {
            return value
        }

        if (fieldPath === 'populationCovered') {
            return populationCoveredValueRecord[value as PopulationCoveredValue]
        }

        if (fieldPath === 'submissionType') {
            return submissionTypeValueRecord[value as SubmissionTypeValue]
        }

        if (fieldPath === 'contractType') {
            return contractActionTypeValueRecord[
                value as ContractActionTypeValue
            ]
        }

        if (fieldPath === 'submissionDescription') {
            return value
        }

        if (fieldPath === 'contractExecutionStatus') {
            return ContractExecutionStatusRecord[
                value as ContractExecutionStatusValue
            ]
        }
    }

    if (
        fieldPath === 'riskBasedContract' ||
        fieldPath === 'dsnpContract' ||
        fieldPath === 'inLieuServicesAndSettings' ||
        fieldPath === 'modifiedBenefitsProvided' ||
        fieldPath === 'modifiedGeoAreaServed' ||
        fieldPath === 'modifiedMedicaidBeneficiaries' ||
        fieldPath === 'modifiedRiskSharingStrategy' ||
        fieldPath === 'modifiedIncentiveArrangements' ||
        fieldPath === 'modifiedWitholdAgreements' ||
        fieldPath === 'modifiedStateDirectedPayments' ||
        fieldPath === 'modifiedPassThroughPayments' ||
        fieldPath === 'modifiedMedicalLossRatioStandards' ||
        fieldPath === 'modifiedOtherFinancialPaymentIncentive' ||
        fieldPath === 'modifiedGrevienceAndAppeal' ||
        fieldPath === 'modifiedNetworkAdequacyStandards' ||
        fieldPath === 'modifiedLengthOfContract' ||
        fieldPath === 'modifiedNonRiskPaymentArrangements' ||
        fieldPath === 'modifiedPaymentsForMentalDiseaseInstitutions'
    ) {
        return formatBooleanValue(value)
    }

    if (fieldPath === 'programIDs') {
        return formatProgramsValue(value, statePrograms)
    }

    if (fieldPath === 'contractDateStart' || fieldPath === 'contractDateEnd') {
        return formatDateValue(value)
    }

    if (fieldPath === 'managedCareEntities') {
        return formatManagedCareEntitiesValue(value)
    }

    if (fieldPath === 'federalAuthorities') {
        return formatStringArrayValue<
            FederalAuthorityValue,
            typeof FederalAuthorityRecord
        >(value, FederalAuthorityRecord)
    }

    return undefined
}

const buildSubmissionTypeRow = (
    fieldChange: RevisionDiffFieldChange,
    statePrograms: ProgramType[]
): ResubmitRevisionChangeRow | undefined => {
    const rowConfig: Record<SubmissionTypeFieldPath, string> = {
        contractName: 'Submission ID',
        populationCovered: 'Medicaid populations',
        submissionType: 'Submission type',
        contractType: 'Contract action type',
        riskBasedContract: 'Risk-based contract',
        programIDs: 'Programs',
        submissionDescription: 'Submission description',
    }

    if (!(fieldChange.fieldPath in rowConfig)) {
        return undefined
    }

    const typedFieldPath = fieldChange.fieldPath as SubmissionTypeFieldPath
    const label = rowConfig[typedFieldPath]

    if (!label) {
        return undefined
    }

    const oldValue = formatFieldValue(
        typedFieldPath,
        fieldChange.oldValue,
        statePrograms
    )
    const newValue = formatFieldValue(
        typedFieldPath,
        fieldChange.newValue,
        statePrograms
    )

    if (!oldValue || !newValue) {
        return undefined
    }

    return {
        label,
        oldValue,
        newValue,
        ...(typedFieldPath === 'submissionDescription'
            ? { breakBeforeNewValue: true }
            : {}),
    }
}

const buildContractDetailsRow = (
    fieldChange: RevisionDiffFieldChange,
    statePrograms: ProgramType[]
): ResubmitRevisionChangeRow | undefined => {
    const rowConfig: Record<ContractDetailsFieldPath, string> = {
        contractExecutionStatus: 'Status',
        contractDateStart: 'Start date',
        contractDateEnd: 'End date',
        managedCareEntities: 'Managed Care entities',
        federalAuthorities: 'Managed Care authorities',
        dsnpContract: 'Associated with a D-SNP',
    }

    if (!(fieldChange.fieldPath in rowConfig)) {
        return undefined
    }

    const typedFieldPath = fieldChange.fieldPath as ContractDetailsFieldPath
    const label = rowConfig[typedFieldPath]
    const oldValue = formatFieldValue(
        typedFieldPath,
        fieldChange.oldValue,
        statePrograms
    )
    const newValue = formatFieldValue(
        typedFieldPath,
        fieldChange.newValue,
        statePrograms
    )

    if (!newValue) {
        return undefined
    }

    if (oldValue === undefined) {
        return {
            label,
            newValue,
            isNew: true,
        }
    }

    return {
        label,
        oldValue,
        newValue,
        ...(typedFieldPath === 'federalAuthorities'
            ? { breakBeforeNewValue: true }
            : {}),
    }
}

const getProvisionLabel = (
    fieldPath: ContractProvisionsFieldPath,
    currentContract: ContractType
): string => {
    const baseLabelConfig: Record<ContractProvisionsFieldPath, string> = {
        inLieuServicesAndSettings: 'In Lieu-of Services and Settings',
        modifiedBenefitsProvided: 'Benefits provided',
        modifiedGeoAreaServed: 'Geo area served',
        modifiedMedicaidBeneficiaries: isChipOnlyContract(currentContract)
            ? 'CHIP beneficiaries'
            : 'Medicaid beneficiaries',
        modifiedRiskSharingStrategy: 'Risk-sharing strategy',
        modifiedIncentiveArrangements: 'Incentive arrangements',
        modifiedWitholdAgreements: 'Withhold arrangements',
        modifiedStateDirectedPayments: 'State directed payments',
        modifiedPassThroughPayments: 'Pass-through payments',
        modifiedMedicalLossRatioStandards: 'Medical loss ratio standards',
        modifiedOtherFinancialPaymentIncentive: 'Other financial payment',
        modifiedGrevienceAndAppeal: 'Grievance and appeal',
        modifiedNetworkAdequacyStandards: 'Network adequacy standards',
        modifiedLengthOfContract: 'Length of the contract',
        modifiedNonRiskPaymentArrangements: 'Non-risk payment arrangements',
        modifiedPaymentsForMentalDiseaseInstitutions:
            'Payments for mental disease institutions',
    }

    return baseLabelConfig[fieldPath]
}

const buildContractProvisionsRow = (
    fieldChange: RevisionDiffFieldChange,
    currentContract: ContractType,
    statePrograms: ProgramType[]
): ResubmitRevisionChangeRow | undefined => {
    const rowOrder: ContractProvisionsFieldPath[] = [
        'inLieuServicesAndSettings',
        'modifiedBenefitsProvided',
        'modifiedGeoAreaServed',
        'modifiedMedicaidBeneficiaries',
        'modifiedRiskSharingStrategy',
        'modifiedIncentiveArrangements',
        'modifiedWitholdAgreements',
        'modifiedStateDirectedPayments',
        'modifiedPassThroughPayments',
        'modifiedMedicalLossRatioStandards',
        'modifiedOtherFinancialPaymentIncentive',
        'modifiedGrevienceAndAppeal',
        'modifiedNetworkAdequacyStandards',
        'modifiedLengthOfContract',
        'modifiedNonRiskPaymentArrangements',
        'modifiedPaymentsForMentalDiseaseInstitutions',
    ]

    if (
        !rowOrder.includes(fieldChange.fieldPath as ContractProvisionsFieldPath)
    ) {
        return undefined
    }

    const typedFieldPath = fieldChange.fieldPath as ContractProvisionsFieldPath
    const oldValue = formatFieldValue(
        typedFieldPath,
        fieldChange.oldValue,
        statePrograms
    )
    const newValue = formatFieldValue(
        typedFieldPath,
        fieldChange.newValue,
        statePrograms
    )

    if (!newValue) {
        return undefined
    }

    const label = getProvisionLabel(typedFieldPath, currentContract)

    if (oldValue === undefined) {
        return {
            label,
            newValue,
            isNew: true,
        }
    }

    return {
        label,
        oldValue,
        newValue,
    }
}

const buildResubmitRevisionChanges = (
    currentContract: ContractType,
    comparison: RevisionDiff,
    statePrograms: ProgramType[]
): ResubmitRevisionChanges => {
    const submissionTypeRows = comparison.fieldChanges
        .map((fieldChange) =>
            buildSubmissionTypeRow(fieldChange, statePrograms)
        )
        .filter((row): row is ResubmitRevisionChangeRow => row !== undefined)
    const contractDetailsRows = comparison.fieldChanges
        .map((fieldChange) =>
            buildContractDetailsRow(fieldChange, statePrograms)
        )
        .filter((row): row is ResubmitRevisionChangeRow => row !== undefined)
    const contractProvisionsRows = comparison.fieldChanges
        .map((fieldChange) =>
            buildContractProvisionsRow(
                fieldChange,
                currentContract,
                statePrograms
            )
        )
        .filter((row): row is ResubmitRevisionChangeRow => row !== undefined)

    const sections: ResubmitRevisionChangeSection[] = []

    if (submissionTypeRows.length > 0) {
        sections.push({
            title: 'SUBMISSION TYPE',
            rows: submissionTypeRows,
        })
    }

    if (contractDetailsRows.length > 0) {
        sections.push({
            title: 'CONTRACT DETAILS',
            rows: contractDetailsRows,
        })
    }

    if (contractProvisionsRows.length > 0) {
        sections.push({
            title: 'CONTRACT PROVISIONS',
            rows: contractProvisionsRows,
        })
    }

    return {
        previousSubmissionDate: formatCalendarDate(
            comparison.olderSubmittedAt,
            EMAIL_TIMEZONE
        ),
        currentSubmissionDate: formatCalendarDate(
            comparison.newerSubmittedAt,
            EMAIL_TIMEZONE
        ),
        hasChanges: comparison.fieldChanges.length > 0,
        sections,
    }
}

export { buildResubmitRevisionChanges, type ResubmitRevisionChanges }
