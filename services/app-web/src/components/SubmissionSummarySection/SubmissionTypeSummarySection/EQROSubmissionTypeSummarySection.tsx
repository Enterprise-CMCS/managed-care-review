import { Grid } from '@trussworks/react-uswds'
import {
    MultiColumnGrid,
    SectionHeader,
    SectionCard,
} from '../../../components'
import {
    eqroValidationAndReviewDetermination,
    getVisibleLatestContractFormData,
    programNames as getProgramNames,
} from '@mc-review/submissions'
import { GenericErrorPage } from '../../../pages/Errors/GenericErrorPage'
import { Contract, UnlockedContract } from '../../../gen/gqlClient'
import styles from '../SubmissionSummarySection.module.scss'
import {
    ContractProgramsSummary,
    ContractTypeSummary,
    ManagedCareEntitySummary,
    PopulationCoverageSummary,
    ReviewDecision,
    SubmissionDescriptionSummary,
    SubmittedAtSummary,
} from '../SummarySectionFields'

export type EQROSubmissionTypeSummarySection = {
    contract: Contract | UnlockedContract
    editNavigateTo?: string
    headerChildComponent?: React.ReactElement
    subHeaderComponent?: React.ReactElement
    initiallySubmittedAt?: Date
    headerText: string
    isStateUser: boolean
    explainMissingData?: boolean
}

const calcChangeInReviewDetermination = (
    contract: Contract | UnlockedContract,
    currentDetermination: boolean
): boolean => {
    if (
        contract.status === 'DRAFT' ||
        contract.status === 'UNLOCKED' ||
        contract.status === 'SUBMITTED'
    ) {
        return false
    }

    if (contract.status === 'RESUBMITTED') {
        const previousRevision =
            contract.packageSubmissions?.[1]?.contractRevision
        if (!previousRevision) return false

        const formData = previousRevision.formData
        const previousReviewDetermination =
            eqroValidationAndReviewDetermination(contract.id, formData)

        if (previousReviewDetermination !== currentDetermination) {
            return true
        }
    }

    return false
}

export const EQROSubmissionTypeSummarySection = ({
    contract,
    initiallySubmittedAt,
    isStateUser,
    editNavigateTo,
    headerChildComponent,
    subHeaderComponent,
    explainMissingData,
    headerText,
}: EQROSubmissionTypeSummarySection): React.ReactElement => {
    const contractFormData = getVisibleLatestContractFormData(
        contract,
        isStateUser
    )
    if (!contractFormData) return <GenericErrorPage />

    const programs = contract.state.programs
    const programNames = getProgramNames(
        programs,
        contractFormData?.programIDs,
        true
    )

    const isSubmitted =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
    const isUnlocked = contract.status === 'UNLOCKED'
    const isDraft = contract.status === 'DRAFT'
    const subjectToReview =
        contract.consolidatedStatus !== 'NOT_SUBJECT_TO_REVIEW'
    const showReviewDetermination = !(isStateUser && (isUnlocked || isDraft))

    const hasReviewDeterminationChanged = calcChangeInReviewDetermination(
        contract,
        subjectToReview
    )

    return (
        <SectionCard
            id="submissionTypeSection"
            className={styles.summarySection}
        >
            <SectionHeader
                header={headerText}
                subHeaderComponent={subHeaderComponent}
                hideBorderTop
                editNavigateTo={editNavigateTo}
                headerId="submissionTypeHeader"
                fontSize="38px"
            >
                {headerChildComponent && headerChildComponent}
            </SectionHeader>
            <dl>
                {showReviewDetermination && (
                    <ReviewDecision
                        subjectToReview={subjectToReview}
                        newDetermination={hasReviewDeterminationChanged}
                    />
                )}
                {initiallySubmittedAt &&
                    (isSubmitted || (!isStateUser && isUnlocked)) && (
                        <SubmittedAtSummary
                            initiallySubmittedAt={initiallySubmittedAt}
                        />
                    )}
                <MultiColumnGrid columns={2}>
                    {(contractFormData.populationCovered || !isSubmitted) && (
                        <PopulationCoverageSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                            label="Populations included in EQRO activities"
                        />
                    )}
                    {(programNames.length > 0 || !isSubmitted) && (
                        <ContractProgramsSummary
                            programNames={programNames}
                            explainMissingData={explainMissingData}
                            label="Programs reviewed by this EQRO"
                        />
                    )}
                    <ManagedCareEntitySummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                    {(contractFormData.contractType || !isSubmitted) && (
                        <ContractTypeSummary
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
