import React from 'react'
import { Grid } from '@trussworks/react-uswds'
import {
    MultiColumnGrid,
    SectionHeader,
    SectionCard,
} from '../../../components'
import { getVisibleLatestContractFormData } from '@mc-review/submissions'
import { GenericErrorPage } from '../../../pages/Errors/GenericErrorPage'
import {
    Contract,
    UnlockedContract,
    ContractRevision,
} from '../../../gen/gqlClient'
import styles from '../SubmissionSummarySection.module.scss'
import {
    ContractProgramsSummary,
    ContractTypeSummary,
    PopulationCoverageSummary,
    ReviewDecisionSummary,
    RiskBasedContractSummary,
    SubmissionDescriptionSummary,
    SubmissionTypeSummary,
    SubmittedAtSummary,
    UpdatedAtSummary,
} from '../SummarySectionFields'
import { formattedProgramNames } from '../../../formHelpers'
import { getConsolidatedContractStatusText } from '../../ContractTable'

export type SubmissionTypeSummarySectionProps = {
    contract: Contract | UnlockedContract
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

    const programIDs = contractFormData?.programIDs ?? []
    const programNames = formattedProgramNames(
        contract.state.programs,
        programIDs
    )

    const isSubmitted =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
    const isUnlocked = contract.status === 'UNLOCKED'

    const lastUpdated = contract.lastUpdatedForDisplay || contract.updatedAt

    return (
        <SectionCard
            id="submissionTypeSection"
            className={styles.summarySection}
        >
            <SectionHeader
                header="Submission type"
                subHeaderComponent={subHeaderComponent}
                editNavigateTo={editNavigateTo}
                headerId={'submissionName'}
                headingLevel="h2"
                hideBorderTop
            >
                {headerChildComponent && headerChildComponent}
            </SectionHeader>
            <dl>
                {contract.consolidatedStatus && isSubmitted && (
                    <ReviewDecisionSummary
                        reviewDecision={
                            contract.consolidatedStatus ===
                                'NOT_SUBJECT_TO_REVIEW' &&
                            contractFormData.populationCovered === 'CHIP'
                                ? 'Not subject to DMCO review and validation'
                                : getConsolidatedContractStatusText(
                                      contract.consolidatedStatus
                                  )
                        }
                        explainMissingData={explainMissingData}
                    />
                )}
                <MultiColumnGrid columns={2}>
                    {initiallySubmittedAt &&
                        (isSubmitted || (!isStateUser && isUnlocked)) && (
                            <SubmittedAtSummary
                                initiallySubmittedAt={initiallySubmittedAt}
                            />
                        )}
                    {lastUpdated && isSubmitted && (
                        <UpdatedAtSummary updatedAt={lastUpdated} />
                    )}
                    {(contractFormData.populationCovered || !isSubmitted) && (
                        <PopulationCoverageSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                        />
                    )}
                    {(programIDs.length > 0 || !isSubmitted) && (
                        <ContractProgramsSummary
                            programNames={programNames}
                            explainMissingData={explainMissingData}
                        />
                    )}
                    {(contractFormData.submissionType || !isSubmitted) && (
                        <SubmissionTypeSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                        />
                    )}
                    {(contractFormData.contractType || !isSubmitted) && (
                        <ContractTypeSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                        />
                    )}
                    {(contractFormData.riskBasedContract !== null ||
                        (!isSubmitted &&
                            contractFormData.riskBasedContract !== null)) && (
                        <RiskBasedContractSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                        />
                    )}
                </MultiColumnGrid>

                <Grid row gap>
                    <Grid col={12}>
                        {(contractFormData.submissionDescription ||
                            !isSubmitted) && (
                            <SubmissionDescriptionSummary
                                contractFormData={contractFormData}
                                explainMissingData={explainMissingData}
                            />
                        )}
                    </Grid>
                </Grid>
            </dl>
        </SectionCard>
    )
}
