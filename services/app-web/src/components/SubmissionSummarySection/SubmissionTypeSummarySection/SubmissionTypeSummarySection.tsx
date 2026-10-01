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
    RevisionDiffFragmentFragment,
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
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

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
    revisionDiff?: RevisionDiffFragmentFragment // present only on the latest resubmission when tags should display
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
    revisionDiff,
}: SubmissionTypeSummarySectionProps): React.ReactElement => {
    const fieldChanges = revisionDiff?.fieldChanges
    const contractOrRev = contractRev ? contractRev : contract
    const ldClient = useLDClient()
    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isStateUser
    )

    if (!contractFormData) return <GenericErrorPage />

    const chipSubmissionAutomation = ldClient?.variation(
        featureFlags.CHIP_SUBMISSION_AUTOMATION.flag,
        featureFlags.CHIP_SUBMISSION_AUTOMATION.defaultValue
    )

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
                {isSubmitted &&
                    chipSubmissionAutomation &&
                    contractFormData.populationCovered === 'CHIP' && (
                        <ReviewDecisionSummary
                            reviewDecision="Not subject to DMCO review and validation"
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
                            fieldChanges={fieldChanges}
                        />
                    )}
                    {(programIDs.length > 0 || !isSubmitted) && (
                        <ContractProgramsSummary
                            programNames={programNames}
                            explainMissingData={explainMissingData}
                            fieldChanges={fieldChanges}
                        />
                    )}
                    {(contractFormData.submissionType || !isSubmitted) && (
                        <SubmissionTypeSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                            fieldChanges={fieldChanges}
                        />
                    )}
                    {(contractFormData.contractType || !isSubmitted) && (
                        <ContractTypeSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                            fieldChanges={fieldChanges}
                        />
                    )}
                    {(contractFormData.riskBasedContract !== null ||
                        (!isSubmitted &&
                            contractFormData.riskBasedContract !== null)) && (
                        <RiskBasedContractSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                            fieldChanges={fieldChanges}
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
                                fieldChanges={fieldChanges}
                            />
                        )}
                    </Grid>
                </Grid>
            </dl>
        </SectionCard>
    )
}
