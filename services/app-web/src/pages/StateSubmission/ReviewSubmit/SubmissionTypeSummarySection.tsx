import { Grid } from '@trussworks/react-uswds'
import { DataDetail } from '../../../components/DataDetail'
import { MultiColumnGrid } from '../../../components/MultiColumnGrid'
import { SectionHeader } from '../../../components/SectionHeader'
import {
    SubmissionTypeRecord,
    ContractTypeRecord,
    PopulationCoveredRecord,
} from '@mc-review/hpp'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { getVisibleLatestContractFormData } from '@mc-review/helpers'
import {
    Program,
    Contract,
    UnlockedContract,
    ContractRevision,
} from '../../../gen/gqlClient'
import { booleanAsYesNoUserValue } from '../../../components/Form/FieldYesNo/FieldYesNo'
import { SectionCard } from '../../../components/SectionCard'
import styles from '../../../components/SubmissionSummarySection/SubmissionSummarySection.module.scss'
import { formatCalendarDate } from '@mc-review/dates'

export type SubmissionTypeSummarySectionProps = {
    contract: Contract | UnlockedContract
    statePrograms: Program[]
    contractRev?: ContractRevision
    editNavigateTo?: string
    headerChildComponent?: React.ReactElement
    subHeaderComponent?: React.ReactElement
    initiallySubmittedAt?: Date
    submissionName: string
    isStateUser: boolean
    explainMissingData?: boolean
}

export const SubmissionTypeSummarySection = ({
    contract,
    contractRev,
    statePrograms,
    editNavigateTo,
    subHeaderComponent,
    headerChildComponent,
    initiallySubmittedAt,
    submissionName,
    isStateUser,
    explainMissingData,
}: SubmissionTypeSummarySectionProps): React.ReactElement => {
    const contractOrRev = contractRev ? contractRev : contract
    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isStateUser
    )
    if (!contractFormData) return <GenericErrorPage />

    const programNames = statePrograms
        .filter((p) => contractFormData?.programIDs.includes(p.id))
        .map((p) => p.name)
    const isSubmitted =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
    const isUnlocked = contract.status === 'UNLOCKED'

    return (
        <SectionCard
            id="submissionTypeSection"
            className={styles.summarySection}
        >
            <SectionHeader
                header={submissionName}
                subHeaderComponent={subHeaderComponent}
                editNavigateTo={editNavigateTo}
                headerId={'submissionName'}
            >
                {headerChildComponent && headerChildComponent}
            </SectionHeader>
            <dl>
                {initiallySubmittedAt &&
                    (isSubmitted || (!isStateUser && isUnlocked)) && (
                        <MultiColumnGrid columns={2}>
                            <DataDetail
                                id="submitted"
                                label="Submitted"
                                children={
                                    <span>
                                        {formatCalendarDate(
                                            initiallySubmittedAt,
                                            'America/Los_Angeles'
                                        )}
                                    </span>
                                }
                            />
                        </MultiColumnGrid>
                    )}
                <MultiColumnGrid columns={2}>
                    {(programNames?.length > 0 || !isSubmitted) && (
                        <DataDetail
                            id="program"
                            label="Program(s)"
                            explainMissingData={explainMissingData}
                            children={programNames}
                        />
                    )}
                    {(contractFormData.submissionType || !isSubmitted) && (
                        <DataDetail
                            id="submissionType"
                            label="Submission type"
                            explainMissingData={explainMissingData}
                            children={
                                SubmissionTypeRecord[
                                    contractFormData.submissionType
                                ]
                            }
                        />
                    )}
                    {(contractFormData.contractType || !isSubmitted) && (
                        <DataDetail
                            id="contractType"
                            label="Contract action type"
                            explainMissingData={explainMissingData}
                            children={
                                contractFormData.contractType
                                    ? ContractTypeRecord[
                                          contractFormData.contractType
                                      ]
                                    : ''
                            }
                        />
                    )}
                    {(contractFormData.riskBasedContract !== null ||
                        (!isSubmitted &&
                            contractFormData.riskBasedContract !== null)) && (
                        <DataDetail
                            id="riskBasedContract"
                            label="Is this a risk based contract"
                            explainMissingData={explainMissingData}
                            children={booleanAsYesNoUserValue(
                                contractFormData.riskBasedContract
                            )}
                        />
                    )}
                    {(contractFormData.populationCovered || !isSubmitted) && (
                        <DataDetail
                            id="populationCoverage"
                            label="Which populations does this contract action cover?"
                            explainMissingData={explainMissingData}
                            children={
                                contractFormData.populationCovered &&
                                PopulationCoveredRecord[
                                    contractFormData.populationCovered
                                ]
                            }
                        />
                    )}
                </MultiColumnGrid>

                <Grid row gap className={styles.reviewDataRow}>
                    <Grid col={12}>
                        {(contractFormData.submissionDescription ||
                            !isSubmitted) && (
                            <DataDetail
                                id="submissionDescription"
                                label="Submission description"
                                explainMissingData={explainMissingData}
                                children={
                                    contractFormData.submissionDescription
                                }
                            />
                        )}
                    </Grid>
                </Grid>
            </dl>
        </SectionCard>
    )
}
