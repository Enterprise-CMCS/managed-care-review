import styles from '../SubmissionSummarySection.module.scss'
import { DataDetail, SectionHeader, SectionCard } from '../../../components'
import { Contract, ContractRevision } from '../../../gen/gqlClient'
import { getVisibleLatestContractFormData } from '@mc-review/submissions'

export type AttestationsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isStateUser: boolean
    explainMissingData?: boolean
}

export const AttestationsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo,
    isStateUser,
    explainMissingData,
}: AttestationsSummarySectionProps): React.ReactElement => {
    const contractOrRev = contractRev ? contractRev : contract

    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isStateUser
    )

    return (
        <SectionCard id="attestations" className={styles.summarySection}>
            <SectionHeader
                header="Attestations"
                editNavigateTo={editNavigateTo}
                hideBorderTop
                headingLevel="h2"
            />

            <dl className={styles.attestationList}>
                <DataDetail
                    id="procurementAttestation"
                    label="Compliance with procurement requirements"
                    explainMissingData={explainMissingData}
                    children={
                        contractFormData?.procurementAttestation
                            ? 'The state has attested that the procurement of this contract conformed with the HHS regulations and policies relevant to contracting for the provision of Medicaid services.'
                            : undefined
                    }
                />
            </dl>
        </SectionCard>
    )
}
