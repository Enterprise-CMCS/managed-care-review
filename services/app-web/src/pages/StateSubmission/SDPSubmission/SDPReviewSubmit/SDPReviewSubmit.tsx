import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import {
    ActionButton,
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActionsContainer,
    SectionCard,
    SectionHeader,
    DataDetail,
    DataDetailContactField,
} from '../../../../components'
import { usePage } from '../../../../contexts/PageContext'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { SDPDetailsFormValues } from '../SDPDetails'
import { SDPContactsFormValues } from '../SDPContacts'
import { SDPSubmissionDetailsFormValues } from '../SDPSubmissionDetails'
import { generatePath, useNavigate } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import styles from './SDPReviewSubmit.module.scss'

type SDPReviewSubmitProps = {
    id: string
    submissionDetailsValues: SDPSubmissionDetailsFormValues
    sdpDetailsValues: SDPDetailsFormValues
    sdpContactsValues: SDPContactsFormValues
    pageErrorMessage?: string | boolean
}

const formatSubmissionType = (
    value?: SDPSubmissionDetailsFormValues['submissionType']
) => {
    switch (value) {
        case 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT':
            return 'New state directed payment preprint'
        case 'AMENDMENT_TO_AN_APPROVED_PREPRINT':
            return 'Amendment to an approved preprint'
        case 'RENEWAL_FOR_NEW_RATING_PERIOD':
            return 'Renewal for new rating period'
        default:
            return undefined
    }
}

export const SDPReviewSubmit = ({
    id,
    submissionDetailsValues,
    sdpDetailsValues,
    sdpContactsValues,
    pageErrorMessage = false,
}: SDPReviewSubmitProps): React.ReactElement => {
    const { updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const activeMainContentId = 'sdpReviewSubmitMainContent'

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={[
                        'SUBMISSIONS_TYPE',
                        'SUBMISSIONS_SDP_DETAILS',
                        'SUBMISSIONS_SDP_CONTACTS',
                        'SUBMISSIONS_SDP_REVIEW_SUBMIT',
                    ]}
                    currentFormPage="SUBMISSIONS_SDP_REVIEW_SUBMIT"
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                        SUBMISSIONS_SDP_DETAILS: 'SDP details',
                        SUBMISSIONS_SDP_CONTACTS: 'Contacts',
                        SUBMISSIONS_SDP_REVIEW_SUBMIT: 'Review and submit',
                    }}
                />
                <PageBannerAlerts showPageErrorMessage={pageErrorMessage} />
            </FormNotificationContainer>
            <FormContainer id="SDPReviewSubmit">
                <GridContainer className={styles.reviewSectionWrapper}>
                    <SectionCard>
                        <SectionHeader
                            header="Submission details"
                            hideBorderTop
                            fontSize="38px"
                            editNavigateTo={generatePath(
                                RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
                                { contractSubmissionType: 'sdp' }
                            )}
                        />
                        <dl>
                            <DataDetail
                                id="sdpSubmissionType"
                                label="Submission type"
                            >
                                {formatSubmissionType(
                                    submissionDetailsValues.submissionType
                                )}
                            </DataDetail>
                            <DataDetail id="sdpPrograms" label="Programs">
                                {submissionDetailsValues.programIDs.join(', ')}
                            </DataDetail>
                        </dl>
                    </SectionCard>

                    <SectionCard>
                        <SectionHeader
                            header="SDP details"
                            fontSize="38px"
                            editNavigateTo={generatePath(
                                RoutesRecord.SUBMISSIONS_SDP_DETAILS,
                                {
                                    id,
                                }
                            )}
                        />
                        <dl>
                            <DataDetail
                                id="sdpDocuments"
                                label="SDP documents"
                            >
                                {sdpDetailsValues.sdpDocuments.length > 0
                                    ? sdpDetailsValues.sdpDocuments
                                          .map((doc) => doc.name)
                                          .join(', ')
                                    : 'No documents added'}
                            </DataDetail>
                            <DataDetail
                                id="sdpRelatedContracts"
                                label="Related contracts"
                            >
                                {sdpDetailsValues.linkContractSelects.filter(Boolean)
                                    .length > 0
                                    ? sdpDetailsValues.linkContractSelects
                                          .filter(Boolean)
                                          .join(', ')
                                    : 'No related contracts added'}
                            </DataDetail>
                        </dl>
                    </SectionCard>

                    <SectionCard>
                        <SectionHeader
                            header="State contacts"
                            fontSize="38px"
                            editNavigateTo={generatePath(
                                RoutesRecord.SUBMISSIONS_SDP_CONTACTS,
                                {
                                    id,
                                }
                            )}
                        />
                        <dl>
                            {sdpContactsValues.stateContacts.map(
                                (contact, index) => (
                                    <DataDetail
                                        key={`sdp-contact-${index}`}
                                        id={`sdp-contact-${index}`}
                                        label={`Contact ${index + 1}`}
                                    >
                                        <DataDetailContactField
                                            contact={contact}
                                        />
                                    </DataDetail>
                                )
                            )}
                        </dl>
                    </SectionCard>

                    <PageActionsContainer>
                        <ActionButton
                            type="button"
                            variant="outline"
                            parent_component_type="page body"
                            onClick={() =>
                                navigate(
                                    generatePath(
                                        RoutesRecord.SUBMISSIONS_SDP_CONTACTS,
                                        { id }
                                    )
                                )
                            }
                        >
                            Back
                        </ActionButton>
                        <ActionButton
                            type="button"
                            variant="default"
                            parent_component_type="page body"
                        >
                            Submit
                        </ActionButton>
                    </PageActionsContainer>
                </GridContainer>
            </FormContainer>
        </div>
    )
}
