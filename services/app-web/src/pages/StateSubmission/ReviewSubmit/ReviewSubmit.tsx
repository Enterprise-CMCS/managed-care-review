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
    SupportingDocumentsSummarySection,
} from '../../../components/SubmissionSummarySection'
import { useAuth } from '../../../contexts/AuthContext'
import { PageActionsContainer } from '../PageActions'
import styles from './ReviewSubmit.module.scss'
import { UnlockedHealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { ActionButton } from '../../../components/ActionButton'
import { DocumentDateLookupTable } from '../../SubmissionSummary/SubmissionSummary'
import { UnlockSubmitModal } from '../../../components/Modal/UnlockSubmitModal'

export const ReviewSubmit = ({
    draftSubmission,
    documentDateLookupTable,
    unlocked,
    submissionName,
}: {
    draftSubmission: UnlockedHealthPlanFormDataType
    documentDateLookupTable?: DocumentDateLookupTable
    unlocked: boolean
    submissionName: string
}): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const { loggedInUser } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    // pull the programs off the user
    const statePrograms =
        (loggedInUser &&
            'state' in loggedInUser &&
            loggedInUser.state.programs) ||
        []

    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                submissionName={submissionName}
                navigateTo="../type"
                statePrograms={statePrograms}
            />

            <ContractDetailsSummarySection
                submission={draftSubmission}
                navigateTo="../contract-details"
                submissionName={submissionName}
                documentDateLookupTable={documentDateLookupTable}
            />

            {isContractActionAndRateCertification && (
                <RateDetailsSummarySection
                    submission={draftSubmission}
                    navigateTo="../rate-details"
                    submissionName={submissionName}
                    documentDateLookupTable={documentDateLookupTable}
                />
            )}

            <ContactsSummarySection
                submission={draftSubmission}
                navigateTo="../contacts"
            />

            <SupportingDocumentsSummarySection
                submission={draftSubmission}
                navigateTo="../documents"
            />

            <PageActionsContainer
                left={
                    <ActionButton
                        type="button"
                        variant="linkStyle"
                        onClick={() => navigate('/dashboard')}
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
