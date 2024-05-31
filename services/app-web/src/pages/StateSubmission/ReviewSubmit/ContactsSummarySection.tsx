import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../StateSubmissionForm.module.scss'

import { SectionHeader } from '../../../components/SectionHeader'
import {
    DataDetail,
    DataDetailContactField,
} from '../../../components/DataDetail'
import { SectionCard } from '../../../components/SectionCard'
import { Contract, ContractRevision } from '../../../gen/gqlClient'
import { getVisibleLatestContractFormData } from '../../../gqlHelpers/contractsAndRates'

export type ContactsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isStateUser: boolean
}

export const ContactsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo,
    isStateUser,
}: ContactsSummarySectionProps): React.ReactElement => {
    const isSubmitted = contract.status === 'SUBMITTED'
    const contractOrRev = contractRev ? contractRev : contract

    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isStateUser
    )
    return (
        <SectionCard id="stateContacts" className={styles.summarySection}>
            <SectionHeader
                header="State contacts"
                editNavigateTo={editNavigateTo}
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
                                explainMissingData={!isSubmitted}
                                children={undefined}
                            />
                        )}
                    </dl>
                </Grid>
            </GridContainer>
        </SectionCard>
    )
}
