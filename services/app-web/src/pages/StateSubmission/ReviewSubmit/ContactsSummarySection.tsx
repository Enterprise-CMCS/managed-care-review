import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../StateSubmissionForm.module.scss'

import { SectionHeader } from '../../../components/SectionHeader'
import {
    DataDetail,
    DataDetailContactField,
} from '../../../components/DataDetail'
import { SectionCard } from '../../../components/SectionCard'
import { Contract, ContractRevision } from '../../../gen/gqlClient'
import { getVisibleLatestContractFormData } from '@mc-review/helpers'

export type ContactsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isStateUser: boolean
    explainMissingData?: boolean
}

export const ContactsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo,
    isStateUser,
    explainMissingData,
}: ContactsSummarySectionProps): React.ReactElement => {
    const contractOrRev = contractRev ? contractRev : contract

    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isStateUser
    )
    return (
        <SectionCard
            id="stateContacts"
            className={styles.stateContactsReviewSection}
        >
            <SectionHeader
                header="State contacts"
                editNavigateTo={editNavigateTo}
                hideBorderTop
                fontSize="38px"
            />

            <GridContainer className="padding-left-0">
                <Grid row>
                    <dl>
                        {contractFormData &&
                        contractFormData.stateContacts.length > 0 ? (
                            contractFormData?.stateContacts.map(
                                (stateContact, index) => (
                                    <DataDetail
                                        key={'statecontact_' + index}
                                        id={'statecontact_' + index}
                                        label={`Contact ${index + 1}`}
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
                </Grid>
            </GridContainer>
        </SectionCard>
    )
}
