import {
    GridContainer,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
} from '../../../components/SubmissionSummarySection'
import { PageActionsContainer } from '../PageActions'
import styles from './ReviewSubmit.module.scss'
import { UnlockedHealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { ActionButton } from '../../../components/ActionButton'
import { UnlockSubmitModal } from '../../../components/Modal/UnlockSubmitModal'
import { useStatePrograms } from '../../../hooks/useStatePrograms'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'
import { RoutesRecord } from '../../../constants'

export const ReviewSubmit = ({
    draftSubmission,
    documentDateLookupTable,
    unlocked,
    submissionName,
}: {
    draftSubmission: UnlockedHealthPlanFormDataType
    documentDateLookupTable: DocumentDateLookupTableType
    unlocked: boolean
    submissionName: string
}): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    // pull the programs off the user
    const statePrograms = useStatePrograms()

    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                submissionName={submissionName}
                editNavigateTo="../type"
                statePrograms={statePrograms}
            />

            <ContractDetailsSummarySection
                submission={draftSubmission}
                editNavigateTo="../contract-details"
                submissionName={submissionName}
                documentDateLookupTable={documentDateLookupTable}
            />

            {isContractActionAndRateCertification && (
                <RateDetailsSummarySection
                    submission={draftSubmission}
                    editNavigateTo="../rate-details"
                    submissionName={submissionName}
                    documentDateLookupTable={documentDateLookupTable}
                    statePrograms={statePrograms}
                />
            )}

            <ContactsSummarySection
                submission={draftSubmission}
                editNavigateTo="../contacts"
            />

            <PageActionsContainer
                left={
                    <ActionButton
                        type="button"
                        variant="linkStyle"
                        onClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                        disabled={isSubmitting}
                    >
                        Save as draft
                    </ActionButton>
                }
            >
                <ActionButton
                    type="button"
                    variant="outline"
                    onClick={() => navigate('../documents')}
                    disabled={isSubmitting}
                >
                    Back
                </ActionButton>
                <ModalToggleButton
                    modalRef={modalRef}
                    className={styles.submitButton}
                    data-testid="form-submit"
                    opener
                >
                    Submit
                </ModalToggleButton>
            </PageActionsContainer>

            {
                // if the session is expiring, close this modal so the countdown modal can appear
                <UnlockSubmitModal
                    healthPlanPackage={draftSubmission}
                    submissionName={submissionName}
                    modalType={unlocked ? 'RESUBMIT' : 'SUBMIT'}
                    modalRef={modalRef}
                    setIsSubmitting={setIsSubmitting}
                />
            }
        </GridContainer>
    )
}
