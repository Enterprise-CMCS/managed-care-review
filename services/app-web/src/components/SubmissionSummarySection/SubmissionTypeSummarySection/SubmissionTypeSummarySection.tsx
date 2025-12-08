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
    RiskBasedContractSummary,
    SubmissionDescriptionSummary,
    SubmissionTypeSummary,
    SubmittedAtSummary,
} from '../SummarySectionFields'

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
                hideBorderTop
                fontSize="38px"
            >
                {headerChildComponent && headerChildComponent}
            </SectionHeader>
            <dl>
                {initiallySubmittedAt &&
                    (isSubmitted || (!isStateUser && isUnlocked)) && (
                        <SubmittedAtSummary
                            initiallySubmittedAt={initiallySubmittedAt}
                        />
                    )}
                <MultiColumnGrid columns={2}>
                    {(contractFormData.programIDs.length > 0 ||
                        !isSubmitted) && (
                        <ContractProgramsSummary
                            contractFormData={contractFormData}
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
                    {(contractFormData.populationCovered || !isSubmitted) && (
                        <PopulationCoverageSummary
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
