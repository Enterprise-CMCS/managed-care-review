import { GridContainer } from '@trussworks/react-uswds'
import styles from '../SubmissionSummarySection.module.scss'
import {
    DataDetail,
    DataDetailContactField,
    SectionHeader,
    SectionCard,
} from '../../../components'
import {
    Contract,
    ContractRevision,
    RevisionDiffFragmentFragment,
} from '../../../gen/gqlClient'
import { getVisibleLatestContractFormData } from '@mc-review/submissions'
import { ChangeTagType } from '../../InfoTag'

export type ContactsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isStateUser: boolean
    explainMissingData?: boolean
    revisionDiff?: RevisionDiffFragmentFragment // present only on the latest resubmission when tags should display
}

export const ContactsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo,
    isStateUser,
    explainMissingData,
    revisionDiff,
}: ContactsSummarySectionProps): React.ReactElement => {
    const contractOrRev = contractRev ? contractRev : contract

    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isStateUser
    )

    const contactChangeTag = (index: number): ChangeTagType | undefined => {
        const change = revisionDiff?.stateContactChanges.find(
            (contactChange) => contactChange.index === index
        )
        if (!change) return undefined
        return change.changeType === 'ADDED' ? 'NEW' : 'UPDATED'
    }

    return (
        <SectionCard id="stateContacts" className={styles.summarySection}>
            <SectionHeader
                header="State contacts"
                editNavigateTo={editNavigateTo}
                hideBorderTop
                headingLevel="h2"
            />

            <GridContainer>
                <dl>
                    {contractFormData &&
                    contractFormData.stateContacts.length > 0 ? (
                        contractFormData?.stateContacts.map(
                            (stateContact, index) => (
                                <DataDetail
                                    key={'statecontact_' + index}
                                    id={'statecontact_' + index}
                                    label={`Contact ${index + 1}`}
                                    changeTag={contactChangeTag(index)}
                                    changeTagPlacement="label"
                                    children={
                                        <DataDetailContactField
                                            contact={stateContact}
                                        />
                                    }
                                />
                            )
                        )
                    ) : (
                        <DataDetail
                            id="statecontact"
                            label="Contact"
                            explainMissingData={explainMissingData}
                            children={undefined}
                        />
                    )}
                </dl>
            </GridContainer>
        </SectionCard>
    )
}
