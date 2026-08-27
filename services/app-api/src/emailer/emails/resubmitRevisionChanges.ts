import { formatCalendarDate } from '@mc-review/dates'
import {
    ActuaryCommunicationRecord,
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

type ResubmitRevisionChangeContact = {
    value: string
}

type ResubmitRevisionDocumentGroupRow = {
    label: 'Added' | 'Removed'
    value: string
}

type ResubmitRevisionDocumentGroup = {
    title: string
    rows: ResubmitRevisionDocumentGroupRow[]
}

type ResubmitRevisionRateGroup = {
    title: string
    rows?: ResubmitRevisionChangeRow[]
    contactsLabel?: string
    contacts?: ResubmitRevisionChangeContact[]
}

type ResubmitRevisionChangeSection = {
    title: string
    rows?: ResubmitRevisionChangeRow[]
    contactsLabel?: string
    contacts?: ResubmitRevisionChangeContact[]
    rateGroups?: ResubmitRevisionRateGroup[]
    documentSummary?: {
        totalChanged: number
        totalAdded: number
        totalRemoved: number
    }
    documentGroups?: ResubmitRevisionDocumentGroup[]
}

type ResubmitRevisionChanges = {
    previousSubmissionDate: string
    currentSubmissionDate: string
    hasChanges: boolean
    sections: ResubmitRevisionChangeSection[]
}

const EMAIL_TIMEZONE = 'America/Los_Angeles'
const MISSING_VALUE_PLACEHOLDER = '⎯'

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
    | 'modifiedEnrollmentProcess'
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

type RateDetailsFieldPath =
    | 'rateCertificationName'
    | 'rateProgramIDs'
    | 'amendmentEffectiveDateStart'
    | 'amendmentEffectiveDateEnd'
    | 'rateType'
    | 'rateDateCertified'
    | 'rateDateStart'
    | 'rateDateEnd'
    | 'rateMedicaidPopulations'
    | 'rateCapitationType'
    | 'actuarialFirms'
    | 'actuaryCommunicationPreference'

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
type RateTypeValue = 'NEW' | 'AMENDMENT'
type RateCapitationTypeValue = 'RATE_CELL' | 'RATE_RANGE'
type RateMedicaidPopulationValue =
    | 'MEDICARE_MEDICAID_WITH_DSNP'
    | 'MEDICAID_ONLY'
    | 'MEDICARE_MEDICAID_WITHOUT_DSNP'
type ActuaryCommunicationValue = 'OACT_TO_ACTUARY' | 'OACT_TO_STATE'

const submissionTypeFieldOrder: SubmissionTypeFieldPath[] = [
    'contractName',
    'populationCovered',
    'submissionType',
    'contractType',
    'riskBasedContract',
    'programIDs',
    'submissionDescription',
]

const contractDetailsFieldOrder: ContractDetailsFieldPath[] = [
    'contractExecutionStatus',
    'contractDateStart',
    'contractDateEnd',
    'managedCareEntities',
    'federalAuthorities',
    'dsnpContract',
]

const rateDetailsFieldOrder: RateDetailsFieldPath[] = [
    'rateCertificationName',
    'rateProgramIDs',
    'amendmentEffectiveDateStart',
    'amendmentEffectiveDateEnd',
    'rateType',
    'rateDateCertified',
    'rateDateStart',
    'rateDateEnd',
    'rateMedicaidPopulations',
    'rateCapitationType',
    'actuarialFirms',
    'actuaryCommunicationPreference',
]

const isChipOnlyContract = (contract: ContractType): boolean =>
    contract.packageSubmissions[0]?.contractRevision.formData
        .populationCovered === 'CHIP'

const submissionTypeValueRecord: Record<SubmissionTypeValue, string> = {
    CONTRACT_ONLY: 'Contract only',
    CONTRACT_AND_RATES: 'Contract and rate(s)',
}

const populationCoveredValueRecord: Record<PopulationCoveredValue, string> = {
    MEDICAID: 'Medicaid',
    CHIP: 'CHIP-only',
    MEDICAID_AND_CHIP: 'Medicaid and CHIP',
}

const contractActionTypeValueRecord: Record<ContractActionTypeValue, string> = {
    BASE: 'Base',
    AMENDMENT: 'Amendment',
}

const contractExecutionStatusValueRecord: Record<
    ContractExecutionStatusValue,
    string
> = {
    EXECUTED: 'Executed',
    UNEXECUTED: 'Unexecuted',
}

const rateTypeValueRecord: Record<RateTypeValue, string> = {
    NEW: 'New',
    AMENDMENT: 'Amendment',
}

const rateCapitationTypeValueRecord: Record<RateCapitationTypeValue, string> = {
    RATE_CELL: 'Cell',
    RATE_RANGE: 'Range',
}

const rateMedicaidPopulationValueRecord: Record<
    RateMedicaidPopulationValue,
    string
> = {
    MEDICARE_MEDICAID_WITH_DSNP:
        'Dually eligible individuals enrolled through a D-SNP',
    MEDICAID_ONLY: 'Medicaid-only',
    MEDICARE_MEDICAID_WITHOUT_DSNP:
        'Dually eligible individuals not enrolled through a D-SNP',
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
        | ContractProvisionsFieldPath
        | RateDetailsFieldPath,
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
            return contractExecutionStatusValueRecord[
                value as ContractExecutionStatusValue
            ]
        }

        if (fieldPath === 'rateCertificationName') {
            return value
        }

        if (fieldPath === 'rateType') {
            return rateTypeValueRecord[value as RateTypeValue]
        }

        if (fieldPath === 'rateCapitationType') {
            return rateCapitationTypeValueRecord[
                value as RateCapitationTypeValue
            ]
        }

        if (fieldPath === 'actuaryCommunicationPreference') {
            return ActuaryCommunicationRecord[
                value as ActuaryCommunicationValue
            ]
        }
    }

    if (
        fieldPath === 'riskBasedContract' ||
        fieldPath === 'dsnpContract' ||
        fieldPath === 'inLieuServicesAndSettings' ||
        fieldPath === 'modifiedBenefitsProvided' ||
        fieldPath === 'modifiedEnrollmentProcess' ||
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

    if (fieldPath === 'programIDs' || fieldPath === 'rateProgramIDs') {
        return formatProgramsValue(value, statePrograms)
    }

    if (
        fieldPath === 'contractDateStart' ||
        fieldPath === 'contractDateEnd' ||
        fieldPath === 'rateDateStart' ||
        fieldPath === 'rateDateEnd' ||
        fieldPath === 'rateDateCertified' ||
        fieldPath === 'amendmentEffectiveDateStart' ||
        fieldPath === 'amendmentEffectiveDateEnd'
    ) {
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

    if (fieldPath === 'rateMedicaidPopulations') {
        return formatStringArrayValue<
            RateMedicaidPopulationValue,
            typeof rateMedicaidPopulationValueRecord
        >(value, rateMedicaidPopulationValueRecord)
    }

    if (fieldPath === 'actuarialFirms') {
        if (!Array.isArray(value)) {
            return undefined
        }

        const firms = value.filter(
            (item): item is string => typeof item === 'string'
        )

        return firms.length > 0 ? firms.join(', ') : undefined
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

    if (oldValue === undefined) {
        return undefined
    }

    return {
        label,
        oldValue,
        newValue: newValue ?? MISSING_VALUE_PLACEHOLDER,
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

    if (oldValue === undefined) {
        if (newValue === undefined) {
            return undefined
        }

        return {
            label,
            newValue,
            isNew: true,
        }
    }

    return {
        label,
        oldValue,
        newValue: newValue ?? MISSING_VALUE_PLACEHOLDER,
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
        modifiedEnrollmentProcess: 'Enrollment/disenrolment process',
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
        'modifiedEnrollmentProcess',
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

    const label = getProvisionLabel(typedFieldPath, currentContract)

    if (oldValue === undefined) {
        if (newValue === undefined) {
            return undefined
        }

        return {
            label,
            newValue,
            isNew: true,
        }
    }

    return {
        label,
        oldValue,
        newValue: newValue ?? MISSING_VALUE_PLACEHOLDER,
    }
}

const buildRateDetailsRow = (
    fieldChange: RevisionDiffFieldChange,
    statePrograms: ProgramType[]
): ResubmitRevisionChangeRow | undefined => {
    const rowConfig: Record<RateDetailsFieldPath, string> = {
        rateCertificationName: 'Rate name',
        rateProgramIDs: 'Rate programs',
        amendmentEffectiveDateStart: 'Rate start',
        amendmentEffectiveDateEnd: 'Rate end',
        rateType: 'Type',
        rateDateCertified: 'Date certified',
        rateDateStart: 'Original rating start',
        rateDateEnd: 'Original rating end',
        rateMedicaidPopulations: 'Medicaid populations included',
        rateCapitationType: 'Rate capitation type',
        actuarialFirms: 'Actuarial firm',
        actuaryCommunicationPreference: 'Actuaries’ communication preference',
    }

    if (!(fieldChange.fieldPath in rowConfig)) {
        return undefined
    }

    const typedFieldPath = fieldChange.fieldPath as RateDetailsFieldPath
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

    if (oldValue === undefined) {
        if (newValue === undefined) {
            return undefined
        }

        return {
            label,
            newValue,
            isNew: true,
        }
    }

    return {
        label,
        oldValue,
        newValue: newValue ?? MISSING_VALUE_PLACEHOLDER,
        ...(typedFieldPath === 'rateCertificationName' ||
        typedFieldPath === 'actuaryCommunicationPreference'
            ? { breakBeforeNewValue: true }
            : {}),
    }
}

const getRateNameForDisplay = (rateCertificationName?: string) =>
    rateCertificationName ?? 'Unknown rate name'

const buildContactValue = (
    contact: RevisionDiff['stateContactChanges'][number]['current']
): string => {
    return [contact.name, contact.titleRole, contact.email]
        .filter((value): value is string => Boolean(value))
        .join(', ')
}

const buildStateContactsSection = (
    comparison: RevisionDiff
): ResubmitRevisionChangeSection | undefined => {
    const contacts = comparison.stateContactChanges
        .map((change) => buildContactValue(change.current))
        .filter(Boolean)
        .map((value) => ({ value }))

    if (contacts.length === 0) {
        return undefined
    }

    return {
        title: 'STATE CONTACTS',
        contactsLabel: 'New and modified:',
        contacts,
    }
}

const buildRateDetailsSection = (
    comparison: RevisionDiff,
    statePrograms: ProgramType[]
): ResubmitRevisionChangeSection | undefined => {
    const { added, removed, revised } = comparison.rateChanges
    const rateGroups: ResubmitRevisionRateGroup[] = []

    for (const addedRate of added) {
        rateGroups.push({
            title: `Added ${getRateNameForDisplay(addedRate.rateCertificationName)}`,
            rows: [
                {
                    label: 'Rate included with another submission',
                    newValue: addedRate.includedInAnotherSubmission
                        ? 'Yes'
                        : 'No',
                },
            ],
        })
    }

    for (const removedRate of removed) {
        rateGroups.push({
            title: `Removed ${getRateNameForDisplay(removedRate.rateCertificationName)}`,
        })
    }

    for (const revisedRate of revised) {
        const rows = revisedRate.fieldChanges
            .flatMap((fieldChange) => {
                const row = buildRateDetailsRow(fieldChange, statePrograms)

                return row
                    ? [
                          {
                              row,
                              fieldPath:
                                  fieldChange.fieldPath as RateDetailsFieldPath,
                          },
                      ]
                    : []
            })
            .sort(
                (left, right) =>
                    rateDetailsFieldOrder.indexOf(left.fieldPath) -
                    rateDetailsFieldOrder.indexOf(right.fieldPath)
            )
            .map(({ row }) => row)

        const contacts = [
            ...revisedRate.certifyingActuaryContactChanges,
            ...revisedRate.addtlActuaryContactChanges,
        ]
            .map((change) => buildContactValue(change.current))
            .filter(Boolean)
            .map((value) => ({ value }))

        // A rate whose only changes are documents is already reported in the documents section.
        if (rows.length === 0 && contacts.length === 0) {
            continue
        }

        rateGroups.push({
            title: `Revised ${getRateNameForDisplay(revisedRate.rateCertificationName)}`,
            ...(rows.length > 0 ? { rows } : {}),
            ...(contacts.length > 0
                ? { contactsLabel: 'New and modified actuaries:', contacts }
                : {}),
        })
    }

    if (rateGroups.length === 0) {
        return undefined
    }

    return {
        title: 'RATE DETAILS',
        rateGroups,
    }
}

const buildDocumentGroupRows = (
    added: string[],
    removed: string[]
): ResubmitRevisionDocumentGroupRow[] => [
    ...added.map((value) => ({
        label: 'Added' as const,
        value,
    })),
    ...removed.map((value) => ({
        label: 'Removed' as const,
        value,
    })),
]

const buildDocumentsSection = (
    comparison: RevisionDiff
): ResubmitRevisionChangeSection | undefined => {
    const documentGroups: ResubmitRevisionDocumentGroup[] = []
    const {
        contractDocuments,
        contractSupportingDocuments,
        ratesDocuments,
        totalAdded,
        totalRemoved,
    } = comparison.documentChanges

    const contractRows = buildDocumentGroupRows(
        contractDocuments.added,
        contractDocuments.removed
    )

    if (contractRows.length > 0) {
        documentGroups.push({
            title: 'CONTRACT',
            rows: contractRows,
        })
    }

    const contractSupportingRows = buildDocumentGroupRows(
        contractSupportingDocuments.added,
        contractSupportingDocuments.removed
    )

    if (contractSupportingRows.length > 0) {
        documentGroups.push({
            title: 'CONTRACT SUPPORTING',
            rows: contractSupportingRows,
        })
    }

    for (const rateDocuments of ratesDocuments) {
        const certificationRows = buildDocumentGroupRows(
            rateDocuments.rateDocuments.added,
            rateDocuments.rateDocuments.removed
        )

        if (certificationRows.length > 0) {
            documentGroups.push({
                title: `RATE CERTIFICATION | ${getRateNameForDisplay(
                    rateDocuments.rateCertificationName
                )}`,
                rows: certificationRows,
            })
        }

        const supportingRows = buildDocumentGroupRows(
            rateDocuments.supportingDocuments.added,
            rateDocuments.supportingDocuments.removed
        )

        if (supportingRows.length > 0) {
            documentGroups.push({
                title: `RATE SUPPORTING | ${getRateNameForDisplay(
                    rateDocuments.rateCertificationName
                )}`,
                rows: supportingRows,
            })
        }
    }

    if (documentGroups.length === 0) {
        return undefined
    }

    return {
        title: 'DOCUMENTS',
        documentSummary: {
            totalChanged: totalAdded + totalRemoved,
            totalAdded,
            totalRemoved,
        },
        documentGroups,
    }
}

const buildResubmitRevisionChanges = (
    currentContract: ContractType,
    comparison: RevisionDiff,
    statePrograms: ProgramType[]
): ResubmitRevisionChanges => {
    const submissionTypeRows = comparison.fieldChanges
        .flatMap((fieldChange) => {
            const row = buildSubmissionTypeRow(fieldChange, statePrograms)

            return row
                ? [
                      {
                          row,
                          fieldPath:
                              fieldChange.fieldPath as SubmissionTypeFieldPath,
                      },
                  ]
                : []
        })
        .sort(
            (left, right) =>
                submissionTypeFieldOrder.indexOf(left.fieldPath) -
                submissionTypeFieldOrder.indexOf(right.fieldPath)
        )
        .map(({ row }) => row)
    const contractDetailsRows = comparison.fieldChanges
        .flatMap((fieldChange) => {
            const row = buildContractDetailsRow(fieldChange, statePrograms)

            return row
                ? [
                      {
                          row,
                          fieldPath:
                              fieldChange.fieldPath as ContractDetailsFieldPath,
                      },
                  ]
                : []
        })
        .sort(
            (left, right) =>
                contractDetailsFieldOrder.indexOf(left.fieldPath) -
                contractDetailsFieldOrder.indexOf(right.fieldPath)
        )
        .map(({ row }) => row)
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

    const rateDetailsSection = buildRateDetailsSection(
        comparison,
        statePrograms
    )
    if (rateDetailsSection) {
        sections.push(rateDetailsSection)
    }

    const stateContactsSection = buildStateContactsSection(comparison)
    if (stateContactsSection) {
        sections.push(stateContactsSection)
    }

    const documentsSection = buildDocumentsSection(comparison)
    if (documentsSection) {
        sections.push(documentsSection)
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
        hasChanges: sections.length > 0,
        sections,
    }
}

export {
    buildResubmitRevisionChanges,
    type ResubmitRevisionChanges,
    type ResubmitRevisionChangeSection,
}
