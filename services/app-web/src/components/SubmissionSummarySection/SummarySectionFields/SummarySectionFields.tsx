import {
    Contract,
    ContractFormData,
    UnlockedContract,
} from '../../../gen/gqlClient'
import { DataDetail, DataDetailCheckboxList } from '../../DataDetail'
import {
    CHIPFederalAuthority,
    ContractExecutionStatusRecord,
    ContractTypeRecord,
    dsnpTriggers,
    federalAuthorityKeysForCHIP,
    FederalAuthorityRecord,
    getProvisionDictionary,
    isBaseContract,
    isMissingProvisions,
    ManagedCareEntityRecord,
    PopulationCoveredRecord,
    sortModifiedProvisions,
    SubmissionTypeRecord,
} from '@mc-review/submissions'
import {
    booleanAsYesNoFormValue,
    booleanAsYesNoUserValue,
} from '../../Form/FieldYesNo'
import { useStatePrograms } from '../../../hooks'
import { formatCalendarDate } from '@mc-review/dates'
import React from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { Grid } from '@trussworks/react-uswds'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationQuestion,
} from '@mc-review/constants'

type SummaryDetailProps = {
    contractFormData: ContractFormData
    explainMissingData?: boolean
    label?: string
}

export const PopulationCoverageSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="populationCoverage"
            label={
                label ?? 'Which populations does this contract action cover?'
            }
            explainMissingData={explainMissingData}
            children={
                contractFormData.populationCovered &&
                PopulationCoveredRecord[contractFormData.populationCovered]
            }
        />
    )
}

export const SubmissionDescriptionSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="submissionDescription"
            label={label ?? 'Submission description'}
            explainMissingData={explainMissingData}
            children={contractFormData.submissionDescription}
        />
    )
}

export const RiskBasedContractSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="riskBasedContract"
            label={label ?? 'Is this a risk based contract'}
            explainMissingData={explainMissingData}
            children={booleanAsYesNoUserValue(
                contractFormData.riskBasedContract
            )}
        />
    )
}

export const ContractTypeSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="contractType"
            label={label ?? 'Contract action type'}
            explainMissingData={explainMissingData}
            children={
                contractFormData.contractType
                    ? ContractTypeRecord[contractFormData.contractType]
                    : ''
            }
        />
    )
}

export const SubmissionTypeSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="submissionType"
            label={label ?? 'Submission type'}
            explainMissingData={explainMissingData}
            children={SubmissionTypeRecord[contractFormData.submissionType]}
        />
    )
}

export const ContractProgramsSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    const statePrograms = useStatePrograms()

    const programNames = statePrograms
        .filter((p) => contractFormData?.programIDs.includes(p.id))
        .map((p) => p.name)

    if (!programNames.length) {
        return null
    }

    return (
        <DataDetail
            id="program"
            label={label ?? 'Program(s)'}
            explainMissingData={explainMissingData}
            children={programNames}
        />
    )
}

export const SubmittedAtSummary = ({
    initiallySubmittedAt,
    label,
}: {
    initiallySubmittedAt: Date
    label?: string
}) => {
    return (
        <DataDetail
            id="submitted"
            label={label ?? 'Submitted'}
            children={
                <span>
                    {formatCalendarDate(
                        initiallySubmittedAt,
                        'America/Los_Angeles'
                    )}
                </span>
            }
        />
    )
}

export const ManagedCareEntitySummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="managedCareEntities"
            label={label ?? 'Managed care entities'}
            children={
                contractFormData?.managedCareEntities && (
                    <DataDetailCheckboxList
                        list={contractFormData?.managedCareEntities}
                        dict={ManagedCareEntityRecord}
                        // if showing error for missing data, then we do NOT display empty list
                        displayEmptyList={!explainMissingData}
                    />
                )
            }
        />
    )
}

export const FederalAuthoritySummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    const isCHIPOnly = contractFormData.populationCovered === 'CHIP'
    const applicableFederalAuthorities = isCHIPOnly
        ? contractFormData?.federalAuthorities.filter((authority) =>
              federalAuthorityKeysForCHIP.includes(
                  authority as CHIPFederalAuthority
              )
          )
        : contractFormData?.federalAuthorities

    return (
        <DataDetail
            id="federalAuthorities"
            label={label ?? 'Active federal operating authority'}
            children={
                applicableFederalAuthorities && (
                    <DataDetailCheckboxList
                        list={applicableFederalAuthorities}
                        dict={FederalAuthorityRecord}
                        // if error for missing data, then we do NOT display empty list
                        displayEmptyList={!explainMissingData}
                    />
                )
            }
        />
    )
}

export const ContractEffectiveDateSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    const dynamicLabel = label
        ? label
        : contractFormData?.contractType === 'AMENDMENT'
          ? 'Contract amendment effective dates'
          : 'Contract effective dates'

    return (
        <DataDetail
            id="contractEffectiveDates"
            label={dynamicLabel}
            explainMissingData={explainMissingData}
            children={
                contractFormData?.contractDateStart &&
                contractFormData?.contractDateEnd
                    ? `${formatCalendarDate(
                          contractFormData?.contractDateStart,
                          'UTC'
                      )} to ${formatCalendarDate(
                          contractFormData?.contractDateEnd,
                          'UTC'
                      )}`
                    : undefined
            }
        />
    )
}

export const ContractExecutionSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="contractExecutionStatus"
            label={label ?? 'Contract status'}
            explainMissingData={explainMissingData}
            children={
                contractFormData?.contractExecutionStatus
                    ? ContractExecutionStatusRecord[
                          contractFormData?.contractExecutionStatus
                      ]
                    : undefined
            }
        />
    )
}

export const StatutoryRegulatoryAttestationSummary = ({
    contractFormData,
    explainMissingData,
}: SummaryDetailProps) => {
    const attestationYesNo =
        contractFormData?.statutoryRegulatoryAttestation != null &&
        booleanAsYesNoFormValue(contractFormData.statutoryRegulatoryAttestation)

    return (
        <Grid row gap className={styles.singleColumnGrid}>
            <Grid tablet={{ col: 12 }} key="statutoryRegulatoryAttestation">
                {attestationYesNo !== false &&
                    attestationYesNo !== undefined && (
                        <DataDetail
                            id="statutoryRegulatoryAttestation"
                            label={StatutoryRegulatoryAttestationQuestion}
                            explainMissingData={explainMissingData}
                            children={
                                StatutoryRegulatoryAttestation[attestationYesNo]
                            }
                        />
                    )}
            </Grid>
            {attestationYesNo === 'NO' && (
                <Grid
                    tablet={{ col: 12 }}
                    key="statutoryRegulatoryAttestationDescription"
                >
                    <DataDetail
                        id="statutoryRegulatoryAttestationDescription"
                        label="Non-compliance description"
                        explainMissingData={explainMissingData}
                        children={
                            contractFormData?.statutoryRegulatoryAttestationDescription
                        }
                    />
                </Grid>
            )}
        </Grid>
    )
}

export const DsnpSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    const dsnpNotProvided =
        contractFormData?.dsnpContract === null ||
        contractFormData?.dsnpContract === undefined
    const dsnpIsRequired =
        contractFormData?.federalAuthorities?.some((authority) =>
            dsnpTriggers?.includes(authority)
        ) && dsnpNotProvided
    const dsnpUserValue =
        contractFormData?.dsnpContract === null
            ? undefined
            : contractFormData?.dsnpContract

    return (
        <DataDetail
            id="dsnp"
            label={
                label ??
                'Is this contract associated with a Dual-Eligible Special Needs Plan (D-SNP) that covers Medicaid benefits?'
            }
            explainMissingData={dsnpIsRequired && explainMissingData}
            children={booleanAsYesNoUserValue(dsnpUserValue)}
        />
    )
}

export const ModifiedProvisionSummary = ({
    contract,
    isEditing,
    explainMissingData,
    label,
}: {
    contract: Contract | UnlockedContract
    isEditing?: boolean
    explainMissingData?: boolean
    label?: string
}) => {
    const provisionsAreInvalid = isMissingProvisions(contract) && isEditing
    const dynamicLabel = label
        ? label
        : isBaseContract(contract)
          ? 'This contract action includes provisions related to the following'
          : 'This contract action includes new or modified provisions related to the following'
    const [modifiedProvisions] = sortModifiedProvisions(contract)

    return (
        <DataDetail
            id="modifiedProvisions"
            label={dynamicLabel}
            explainMissingData={provisionsAreInvalid && explainMissingData}
        >
            {provisionsAreInvalid ? null : (
                <DataDetailCheckboxList
                    list={modifiedProvisions}
                    dict={getProvisionDictionary(contract)}
                    displayEmptyList
                />
            )}
        </DataDetail>
    )
}

export const UnmodifiedProvisionSummary = ({
    contract,
    isEditing,
    explainMissingData,
    label,
}: {
    contract: Contract | UnlockedContract
    isEditing?: boolean
    explainMissingData?: boolean
    label?: string
}) => {
    const provisionsAreInvalid = isMissingProvisions(contract) && isEditing
    const dynamicLabel = label
        ? label
        : isBaseContract(contract)
          ? 'This contract action does NOT include provisions related to the following'
          : 'This contract action does NOT include new or modified provisions related to the following'
    const unmodifiedProvisions = sortModifiedProvisions(contract)[1]

    return (
        <DataDetail
            id="unmodifiedProvisions"
            label={dynamicLabel}
            explainMissingData={provisionsAreInvalid && explainMissingData}
        >
            {provisionsAreInvalid ? null : (
                <DataDetailCheckboxList
                    list={unmodifiedProvisions}
                    dict={getProvisionDictionary(contract)}
                    displayEmptyList
                />
            )}
        </DataDetail>
    )
}

export const NewEQROContractorSummary = ({
    contractFormData,
    explainMissingData,
    label,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="newEQROContractor"
            label={label ?? 'Is this contract with a new EQRO contractor'}
            explainMissingData={explainMissingData}
            children={booleanAsYesNoUserValue(
                contractFormData.eqroNewContractor
            )}
        />
    )
}

const getEQROProvisionDictionary = (contractFormData: ContractFormData) => {
    const provisionDictionary = {
        eqroProvisionMcoNewOptionalActivity:
            'New optional activities to be performed on MCOs in accordance with 42 CFR § 438.358(c)',
        eqroProvisionNewMcoEqrRelatedActivities:
            'EQR-related activities for a new MCO managed care program',
        eqroProvisionChipEqrRelatedActivities:
            'EQR-related activities performed on the CHIP population',
        eqroProvisionMcoEqrOrRelatedActivities:
            'EQR or EQR-related activities performed on MCOs',
    } as const

    type EQROProvisionKey = keyof typeof provisionDictionary

    const includedProvisions: EQROProvisionKey[] = []
    const excludedProvisions: EQROProvisionKey[] = []
    const unansweredProvisions: EQROProvisionKey[] = []

    for (const key of Object.keys(provisionDictionary) as EQROProvisionKey[]) {
        const value = booleanAsYesNoUserValue(contractFormData[key])

        if (value === 'Yes') {
            includedProvisions.push(key)
        } else if (value === 'No') {
            excludedProvisions.push(key)
        } else {
            unansweredProvisions.push(key)
        }
    }

    return {
        includedProvisions,
        excludedProvisions,
        unansweredProvisions,
        provisionDictionary,
    }
}

export const EQROModifiedProvisionSummary = ({
    contractFormData,
    explainMissingData,
}: SummaryDetailProps) => {
    const {
        includedProvisions,
        excludedProvisions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        unansweredProvisions, // keep for future inline errors
        provisionDictionary,
    } = getEQROProvisionDictionary(contractFormData)

    return (
        <Grid row gap className={styles.singleColumnGrid}>
            <DataDetail
                id="includesProvisions"
                label="This contract action includes new or modified provisions related to the following"
                explainMissingData={explainMissingData}
            >
                <DataDetailCheckboxList
                    list={includedProvisions}
                    dict={provisionDictionary}
                    displayEmptyList
                />
            </DataDetail>
            <DataDetail
                id="excludesProvisions"
                label="This contract action does NOT include new or modified provisions related to the following"
                explainMissingData={explainMissingData}
            >
                <DataDetailCheckboxList
                    list={excludedProvisions}
                    dict={provisionDictionary}
                    displayEmptyList
                />
            </DataDetail>
        </Grid>
    )
}
