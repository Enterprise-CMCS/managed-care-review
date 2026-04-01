import React, { useEffect, useRef, useState } from 'react'
import { GridContainer, ModalRef } from '@trussworks/react-uswds'
import {
    ActionButton,
    NavLinkWithLogging,
    DynamicStepIndicator,
    FormNotificationContainer,
    PageActionsContainer,
    SectionCard,
    SectionHeader,
    DataDetail,
    DataDetailContactField,
    UploadedDocumentsTable,
} from '../../../../components'
import { Modal, ModalOpenButton } from '../../../../components/Modal'
import { usePage } from '../../../../contexts/PageContext'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { SDPDetailsFormValues } from '../SDPDetails'
import { SDPContactsFormValues } from '../SDPContacts'
import { SDPSubmissionDetailsFormValues } from '../SDPSubmissionDetails'
import { generatePath, useNavigate } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { useStatePrograms } from '../../../../hooks'
import {
    GenericDocument,
    useFetchContractQuery,
} from '../../../../gen/gqlClient'
import styles from './SDPReviewSubmit.module.scss'
import { getSubmissionPath } from '../../../../routeHelpers'

type SDPReviewSubmitProps = {
    id: string
    submissionDetailsValues: SDPSubmissionDetailsFormValues
    sdpDetailsValues: SDPDetailsFormValues
    sdpContactsValues: SDPContactsFormValues
    pageErrorMessage?: string | boolean
    onSubmit: () => Promise<boolean>
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
            return 'Not provided'
    }
}

const formatProgramNames = (
    programIDs: SDPSubmissionDetailsFormValues['programIDs'],
    programs: ReturnType<typeof useStatePrograms>
) => {
    const selectedProgramNames = programs
        .filter((program) => programIDs.includes(program.id))
        .map((program) => program.name)

    return selectedProgramNames.length > 0
        ? selectedProgramNames.join(', ')
        : 'None selected'
}

const formatChangesIncluded = (
    changesIncluded: SDPSubmissionDetailsFormValues['changesIncluded']
) => {
    const changeLabelMap: Record<
        SDPSubmissionDetailsFormValues['changesIncluded'][number],
        string
    > = {
        RATING_PERIOD: 'Rating period',
        PAYMENT_TYPE: 'Payment type',
        PROVIDER_TYPE: 'Provider type',
        QUALITY_METRICS_OR_BENCHMARKS: 'Quality metrics or benchmarks',
        OTHER: 'Other',
    }

    return changesIncluded.length > 0
        ? changesIncluded.map((change) => changeLabelMap[change]).join(', ')
        : 'None selected'
}

const formatDateRange = (startDate: string, endDate: string) => {
    if (!startDate && !endDate) return 'Not provided'
    if (!startDate) return `End date: ${endDate}`
    if (!endDate) return `Start date: ${startDate}`
    return `${startDate} to ${endDate}`
}

const formatAutoRenewed = (
    value?: SDPSubmissionDetailsFormValues['automaticallyRenewed']
) => {
    switch (value) {
        case 'YES':
            return 'Yes'
        case 'NO':
            return 'No'
        default:
            return 'Not provided'
    }
}

const mapFileItemsToDocuments = (
    files: SDPDetailsFormValues['sdpDocuments']
): GenericDocument[] =>
    files.map((file) => ({
        __typename: 'GenericDocument',
        id: file.id,
        name: file.name,
        s3URL: file.s3URL ?? '',
        sha256: file.sha256 ?? '',
        dateAdded: file.dateAdded?.toISOString() ?? null,
        downloadURL: file.s3URL ?? null,
        s3BucketName: null,
        s3Key: file.key ?? null,
    }))

const LinkedContractSummaryLink = ({
    contractID,
}: {
    contractID: string
}): React.ReactElement | null => {
    const { data } = useFetchContractQuery({
        variables: {
            input: {
                contractID,
            },
        },
        fetchPolicy: 'cache-first',
    })

    const contract = data?.fetchContract.contract

    if (!contract || contract.contractSubmissionType === 'SDP') {
        return null
    }

    const contractName =
        contract.draftRevision?.contractName ??
        contract.packageSubmissions?.[0]?.contractRevision.contractName ??
        `MCR-${contract.stateCode}-${String(contract.stateNumber).padStart(
            4,
            '0'
        )}`

    return (
        <div>
            <NavLinkWithLogging
                to={getSubmissionPath(
                    'SUBMISSIONS_SUMMARY',
                    contract.contractSubmissionType,
                    contract.id
                )}
            >
                {contractName}
            </NavLinkWithLogging>
        </div>
    )
}

export const SDPReviewSubmit = ({
    id,
    submissionDetailsValues,
    sdpDetailsValues,
    sdpContactsValues,
    pageErrorMessage = false,
    onSubmit,
}: SDPReviewSubmitProps): React.ReactElement => {
    const { updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const statePrograms = useStatePrograms()
    const activeMainContentId = 'sdpReviewSubmitMainContent'
    const sdpDocuments = mapFileItemsToDocuments(sdpDetailsValues.sdpDocuments)
    const modalRef = useRef<ModalRef>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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
            <GridContainer className={styles.reviewSectionWrapper}>
                <SectionCard>
                    <SectionHeader
                        header="Submission details"
                        hideBorderTop
                        hideBorderBottom
                        fontSize="38px"
                        editNavigateTo={generatePath(
                            RoutesRecord.SUBMISSIONS_SDP_TYPE,
                            { id }
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
                        <DataDetail
                            id="sdpPrograms"
                            label="Programs this action covers"
                        >
                            {formatProgramNames(
                                submissionDetailsValues.programIDs,
                                statePrograms
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdpChangesIncluded"
                            label="Changes included in this preprint"
                        >
                            {formatChangesIncluded(
                                submissionDetailsValues.changesIncluded
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdpRatingPeriod"
                            label="Rating period for which this payment arrangement will apply"
                        >
                            {formatDateRange(
                                submissionDetailsValues.ratingPeriodStart,
                                submissionDetailsValues.ratingPeriodEnd
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdpEstimatedFederalShare"
                            label="Estimated federal share"
                        >
                            {submissionDetailsValues.estimatedFederalShare ||
                                'Not provided'}
                        </DataDetail>
                        <DataDetail
                            id="sdpEstimatedStateShare"
                            label="Estimated state share"
                        >
                            {submissionDetailsValues.estimatedStateShare ||
                                'Not provided'}
                        </DataDetail>
                        <DataDetail
                            id="sdpAutomaticallyRenewed"
                            label="Is this payment arrangement renewed automatically?"
                        >
                            {formatAutoRenewed(
                                submissionDetailsValues.automaticallyRenewed
                            )}
                        </DataDetail>
                    </dl>
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        header="SDP details"
                        hideBorderTop
                        hideBorderBottom
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
                            id="sdpRelatedContracts"
                            label="Related contracts"
                        >
                            {sdpDetailsValues.relatedContracts.length > 0
                                ? sdpDetailsValues.relatedContracts.map(
                                      (contractID) => (
                                          <LinkedContractSummaryLink
                                              key={contractID}
                                              contractID={contractID}
                                          />
                                      )
                                  )
                                : 'No related contracts added'}
                        </DataDetail>
                    </dl>
                    <UploadedDocumentsTable
                        documents={sdpDocuments}
                        previousSubmissionDate={null}
                        caption="SDP documents"
                        documentCategory="SDP"
                        hideDynamicFeedback
                    />
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        header="State contacts"
                        hideBorderTop
                        hideBorderBottom
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
                                    <DataDetailContactField contact={contact} />
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
                    <ModalOpenButton
                        modalRef={modalRef}
                        className={styles.submitButton}
                        id="sdp-review-submit-modal-open-button"
                    >
                        Submit
                    </ModalOpenButton>
                </PageActionsContainer>
                <Modal
                    id="sdp-review-submit-modal"
                    modalRef={modalRef}
                    modalHeading="Ready to submit?"
                    onSubmit={() => {
                        void (async () => {
                            setIsSubmitting(true)
                            const didSubmit = await onSubmit()
                            if (didSubmit) {
                                modalRef.current?.toggleModal(undefined, false)
                            }
                            setIsSubmitting(false)
                        })()
                    }}
                    onSubmitText="Submit"
                    isSubmitting={isSubmitting}
                >
                    <p>
                        Submitting this SDP will send it to CMS to begin their
                        review.
                    </p>
                </Modal>
            </GridContainer>
        </div>
    )
}
