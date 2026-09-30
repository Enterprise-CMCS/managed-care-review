import { ContractFormData } from '../../../gen/gqlClient'
import {
    DataDetail,
    DataDetailCheckboxList,
    DataDetailMissingField,
} from '../../DataDetail'
import {
    CHIPFederalAuthority,
    ContractExecutionStatusRecord,
    ContractTypeRecord,
    dsnpTriggers,
    federalAuthorityKeysForCHIP,
    FederalAuthorityRecord,
    getProvisionDictionary,
    isMissingProvisions,
    ManagedCareEntityRecord,
    PopulationCoveredRecord,
    sortModifiedProvisions,
    SubmissionTypeRecord,
    eqroValidationAndReviewDetermination,
} from '@mc-review/submissions'
import {
    booleanAsYesNoFormValue,
    booleanAsYesNoUserValue,
} from '../../Form/FieldYesNo'
import { formatCalendarDate } from '@mc-review/dates'
import React from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { Grid } from '@trussworks/react-uswds'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationQuestion,
} from '@mc-review/constants'
import { SectionHeader } from '../../SectionHeader'
import { NewTag } from '../../InfoTag'
import { RevisionDiffFragmentFragment } from '../../../gen/gqlClient'
import { fieldChangeTag, changedListItemTags } from '../revisionDiffTagHelpers'

type RevisionDiffFieldChanges = RevisionDiffFragmentFragment['fieldChanges']

type SummaryDetailProps = {
    contractFormData: ContractFormData
    reviewDecision?: string
    explainMissingData?: boolean
    label?: string
    fieldChanges?: RevisionDiffFieldChanges // present only when revision-history tags should display
}

export const ReviewDecisionSummary = ({
    reviewDecision,
    explainMissingData,
    label,
}: Omit<SummaryDetailProps, 'contractFormData'>) => {
    return (
        <DataDetail
            id="reviewDecision"
            label={label ?? 'Review decision'}
            explainMissingData={explainMissingData}
            children={reviewDecision}
        />
    )
}

export const PopulationCoverageSummary = ({
    contractFormData,
    explainMissingData,
    label,
    fieldChanges,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="populationCoverage"
            changeTag={fieldChangeTag(fieldChanges, 'populationCovered')}
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
    fieldChanges,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="submissionDescription"
            changeTag={fieldChangeTag(fieldChanges, 'submissionDescription')}
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
    fieldChanges,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="riskBasedContract"
            changeTag={fieldChangeTag(fieldChanges, 'riskBasedContract')}
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
    fieldChanges,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="contractType"
            changeTag={fieldChangeTag(fieldChanges, 'contractType')}
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
    fieldChanges,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="submissionType"
            changeTag={fieldChangeTag(fieldChanges, 'submissionType')}
            label={label ?? 'Submission type'}
            explainMissingData={explainMissingData}
            children={SubmissionTypeRecord[contractFormData.submissionType]}
        />
    )
}

export const ContractProgramsSummary = ({
    programNames,
    explainMissingData,
    label,
    fieldChanges,
}: {
    programNames?: string[] | React.ReactNode
    explainMissingData?: boolean
    label?: string
    fieldChanges?: RevisionDiffFieldChanges
}) => {
    return (
        <DataDetail
            id="program"
            changeTag={fieldChangeTag(fieldChanges, 'programIDs')}
            label={label ?? 'Program(s)'}
            explainMissingData={explainMissingData}
            children={programNames}
        />
    )
}

export const ReviewDecision = ({
    subjectToReview,
    label,
    newDetermination,
}: {
    subjectToReview?: boolean
    label?: string
    newDetermination?: boolean
}) => {
    const unavailableDetermination = subjectToReview === undefined
    let renderReviewDetermination = ''

    if (unavailableDetermination) {
        renderReviewDetermination = 'Review determination unavailable'
    } else {
        renderReviewDetermination = subjectToReview
            ? 'Subject to formal review and approval'
            : 'Not subject to formal review and approval'
    }

    return (
        <DataDetail
            id="reviewDecision"
            label={label ?? 'Review decision'}
            explainMissingData={unavailableDetermination}
            explainMissingDataMsg={renderReviewDetermination}
        >
            {!unavailableDetermination && (
                <span>
                    {newDetermination && (
                        <NewTag className={styles.tagSpacing} />
                    )}
                    {renderReviewDetermination}
                </span>
            )}
        </DataDetail>
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
            id="submissionDate"
            label={label ?? 'Submission date'}
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

export const UpdatedAtSummary = ({
    updatedAt,
    label,
}: {
    updatedAt: Date
    label?: string
}) => {
    return (
        <DataDetail
            id="lastUpdated"
            label={label ?? 'Last updated'}
            children={
                <span>
                    {formatCalendarDate(updatedAt, 'America/Los_Angeles')}
                </span>
            }
        />
    )
}

export const ManagedCareEntitySummary = ({
    contractFormData,
    explainMissingData,
    label,
    fieldChanges,
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
                        itemTags={changedListItemTags(
                            fieldChanges,
                            'managedCareEntities'
                        )}
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
    fieldChanges,
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
                        itemTags={changedListItemTags(
                            fieldChanges,
                            'federalAuthorities'
                        )}
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
    fieldChanges,
}: SummaryDetailProps) => {
    const dynamicLabel = label
        ? label
        : contractFormData?.contractType === 'AMENDMENT'
          ? 'Contract amendment effective dates'
          : 'Contract effective dates'

    return (
        <DataDetail
            id="contractEffectiveDates"
            changeTag={
                fieldChangeTag(fieldChanges, 'contractDateStart') ??
                fieldChangeTag(fieldChanges, 'contractDateEnd')
            }
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
    fieldChanges,
}: SummaryDetailProps) => {
    return (
        <DataDetail
            id="contractExecutionStatus"
            changeTag={fieldChangeTag(fieldChanges, 'contractExecutionStatus')}
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
    fieldChanges,
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
                            changeTag={fieldChangeTag(
                                fieldChanges,
                                'statutoryRegulatoryAttestation'
                            )}
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
                        changeTag={fieldChangeTag(
                            fieldChanges,
                            'statutoryRegulatoryAttestationDescription'
                        )}
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
    fieldChanges,
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
            changeTag={fieldChangeTag(fieldChanges, 'dsnpContract')}
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
    formData,
    isEditing,
    explainMissingData,
    label,
    fieldChanges,
}: {
    formData: ContractFormData
    isEditing?: boolean
    explainMissingData?: boolean
    label?: string
    fieldChanges?: RevisionDiffFieldChanges
}) => {
    const provisionsAreInvalid = isMissingProvisions(formData) && isEditing
    const dynamicLabel = label
        ? label
        : formData.contractType === 'BASE'
          ? 'This contract action includes provisions related to the following'
          : 'This contract action includes new or modified provisions related to the following'
    const [modifiedProvisions] = sortModifiedProvisions(formData)
    // Each provision is its own boolean form field, so each list item derives its own tag
    const provisionItemTags = Object.fromEntries(
        modifiedProvisions.map((provision) => [
            provision,
            fieldChangeTag(fieldChanges, provision),
        ])
    )

    return (
        <DataDetail
            id="modifiedProvisions"
            label={dynamicLabel}
            explainMissingData={provisionsAreInvalid && explainMissingData}
        >
            {provisionsAreInvalid ? null : (
                <DataDetailCheckboxList
                    list={modifiedProvisions}
                    dict={getProvisionDictionary(formData)}
                    displayEmptyList
                    itemTags={provisionItemTags}
                />
            )}
        </DataDetail>
    )
}

export const UnmodifiedProvisionSummary = ({
    formData,
    isEditing,
    explainMissingData,
    label,
    fieldChanges,
}: {
    formData: ContractFormData
    isEditing?: boolean
    explainMissingData?: boolean
    label?: string
    fieldChanges?: RevisionDiffFieldChanges
}) => {
    const provisionsAreInvalid = isMissingProvisions(formData) && isEditing
    const dynamicLabel = label
        ? label
        : formData.contractType === 'BASE'
          ? 'This contract action does NOT include provisions related to the following'
          : 'This contract action does NOT include new or modified provisions related to the following'
    const unmodifiedProvisions = sortModifiedProvisions(formData)[1]
    // Each provision is its own boolean form field, so each list item derives its own tag
    const provisionItemTags = Object.fromEntries(
        unmodifiedProvisions.map((provision) => [
            provision,
            fieldChangeTag(fieldChanges, provision),
        ])
    )

    return (
        <DataDetail
            id="unmodifiedProvisions"
            label={dynamicLabel}
            explainMissingData={provisionsAreInvalid && explainMissingData}
        >
            {provisionsAreInvalid ? null : (
                <DataDetailCheckboxList
                    list={unmodifiedProvisions}
                    dict={getProvisionDictionary(formData)}
                    displayEmptyList
                    itemTags={provisionItemTags}
                />
            )}
        </DataDetail>
    )
}

export const NewEQROContractorSummary = ({
    contractFormData,
    explainMissingData,
    label,
    fieldChanges,
}: SummaryDetailProps) => {
    // Base contract that includes MCO shows new EQRO contractor question.
    const showField =
        contractFormData.contractType === 'BASE' &&
        contractFormData.managedCareEntities.includes('MCO')

    if (!showField) {
        return null
    }

    return (
        <DataDetail
            id="newEQROContractor"
            changeTag={fieldChangeTag(fieldChanges, 'eqroNewContractor')}
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
    contractID,
    contractFormData,
    explainMissingData,
    fieldChanges,
}: { contractID: string } & SummaryDetailProps) => {
    const isValidEQROProvisions = !(
        eqroValidationAndReviewDetermination(
            contractID,
            contractFormData
        ) instanceof Error
    )

    const { includedProvisions, excludedProvisions, provisionDictionary } =
        getEQROProvisionDictionary(contractFormData)
    // Each EQRO provision is its own boolean form field, so each item derives its own tag
    const includedProvisionTags = Object.fromEntries(
        includedProvisions.map((provision) => [
            provision,
            fieldChangeTag(fieldChanges, provision),
        ])
    )
    const excludedProvisionTags = Object.fromEntries(
        excludedProvisions.map((provision) => [
            provision,
            fieldChangeTag(fieldChanges, provision),
        ])
    )

    // Population covered of Medicaid and no MCO in managed care entities do not have provision questions.
    const hideProvisions =
        contractFormData.populationCovered === 'MEDICAID' &&
        !contractFormData.managedCareEntities.includes('MCO')

    if (hideProvisions) {
        return null
    }

    return (
        <>
            <SectionHeader
                header="Provisions"
                hideBorderTop
                headingLevel="h3"
            />
            <Grid row gap className={styles.singleColumnGrid}>
                <DataDetail
                    id="includesProvisions"
                    label="This contract action includes new or modified provisions related to the following"
                    explainMissingData={explainMissingData}
                >
                    {isValidEQROProvisions ? (
                        <DataDetailCheckboxList
                            list={includedProvisions}
                            dict={provisionDictionary}
                            displayEmptyList
                            itemTags={includedProvisionTags}
                        />
                    ) : (
                        <DataDetailMissingField />
                    )}
                </DataDetail>
                <DataDetail
                    id="excludesProvisions"
                    label="This contract action does NOT include new or modified provisions related to the following"
                    explainMissingData={explainMissingData}
                >
                    {isValidEQROProvisions ? (
                        <DataDetailCheckboxList
                            list={excludedProvisions}
                            dict={provisionDictionary}
                            displayEmptyList
                            itemTags={excludedProvisionTags}
                        />
                    ) : (
                        <DataDetailMissingField />
                    )}
                </DataDetail>
            </Grid>
        </>
    )
}
