import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../../../../../components/SubmissionSummarySection/SubmissionSummarySection.module.scss'

import { SectionHeader } from '../../../../../components/SectionHeader'
import {
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
} from '../../../../../constants/healthPlanPackages'
import { ActuaryContact } from '../../../../../common-code/healthPlanFormDataType'
import {
    DataDetail,
    DataDetailContactField,
} from '../../../../../components/DataDetail'
import { SectionCard } from '../../../../../components/SectionCard'
import {
    Contract,
    RateRevision,
    ContractRevision,
} from '../../../../../gen/gqlClient'
import {
    getDraftRates,
    getLastContractSubmission,
    getVisibleLatestContractFormData,
} from '../../../../../gqlHelpers/contractsAndRates'

export type ContactsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isStateUser: boolean
}

export const getActuaryFirm = (actuaryContact: ActuaryContact): string => {
    if (
        actuaryContact.actuarialFirmOther &&
        actuaryContact.actuarialFirm === 'OTHER'
    ) {
        return actuaryContact.actuarialFirmOther
    } else if (
        actuaryContact.actuarialFirm &&
        ActuaryFirmsRecord[actuaryContact.actuarialFirm]
    ) {
        return ActuaryFirmsRecord[actuaryContact.actuarialFirm]
    } else {
        return ''
    }
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
    let rateRev: RateRevision | undefined = undefined

    if (contractFormData?.submissionType === 'CONTRACT_AND_RATES') {
        // Find first rate associated with the contract to deal with rates info on contacts page
        // TODO move the fields using this data to rate details
        const draftRates = getDraftRates(contract)
        rateRev =
            (draftRates && draftRates[0]?.draftRevision) ||
            getLastContractSubmission(contract)?.rateRevisions[0]
    }
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

            {contractFormData?.submissionType === 'CONTRACT_AND_RATES' && (
                <>
                    {rateRev?.formData?.addtlActuaryContacts !== undefined &&
                        rateRev.formData.addtlActuaryContacts.length > 0 && (
                            <dl>
                                <SectionHeader header="Additional actuary contacts" />
                                <GridContainer>
                                    <Grid row>
                                        {rateRev.formData?.addtlActuaryContacts.map(
                                            (actuaryContact, index) => (
                                                <Grid
                                                    col={6}
                                                    key={
                                                        'actuarycontact_' +
                                                        index
                                                    }
                                                >
                                                    <DataDetail
                                                        id={
                                                            'actuarycontact_' +
                                                            index
                                                        }
                                                        label="Additional actuary contact"
                                                        children={
                                                            <DataDetailContactField
                                                                contact={
                                                                    actuaryContact
                                                                }
                                                            />
                                                        }
                                                    />
                                                </Grid>
                                            )
                                        )}
                                    </Grid>
                                </GridContainer>
                            </dl>
                        )}
                    <dl>
                        <GridContainer>
                            <DataDetail
                                id="communicationPreference"
                                label="Actuaries’ communication preference"
                                children={
                                    rateRev?.formData
                                        ?.actuaryCommunicationPreference &&
                                    ActuaryCommunicationRecord[
                                        rateRev.formData
                                            .actuaryCommunicationPreference
                                    ]
                                }
                                explainMissingData={!isSubmitted}
                            />
                        </GridContainer>
                    </dl>
                </>
            )}
        </SectionCard>
    )
}
