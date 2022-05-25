import {
    Alert,
    GridContainer,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
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
import { ReviewSubmitModal } from './ReviewSubmitModal'

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
    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const history = useHistory()
    const modalRef = useRef<ModalRef>(null)
    const { loggedInUser } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    // pull the programs off the user
    const statePrograms =
        (loggedInUser &&
            'state' in loggedInUser &&
            loggedInUser.state.programs) ||
        []

    const showError = (error: string) => {
        setUserVisibleError(error)
    }

    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            {userVisibleError && (
                <Alert type="error" heading="Submission Error">
                    {userVisibleError}
                </Alert>
            )}

            <SubmissionTypeSummarySection
                submission={draftSubmission}
                submissionName={submissionName}
                navigateTo="type"
                statePrograms={statePrograms}
            />

            <ContractDetailsSummarySection
                submission={draftSubmission}
                navigateTo="contract-details"
                submissionName={submissionName}
                documentDateLookupTable={documentDateLookupTable}
            />

            {isContractActionAndRateCertification && (
                <RateDetailsSummarySection
                    submission={draftSubmission}
                    navigateTo="rate-details"
                    submissionName={submissionName}
                    documentDateLookupTable={documentDateLookupTable}
                />
            )}

            <ContactsSummarySection
                submission={draftSubmission}
                navigateTo="contacts"
            />

            <SupportingDocumentsSummarySection
                submission={draftSubmission}
                navigateTo="documents"
            />

            <PageActionsContainer
                left={
                    <ActionButton
                        type="button"
                        variant="linkStyle"
                        onClick={() => history.push('/dashboard')}
                        disabled={isSubmitting}
                    >
                        Save as draft
                    </ActionButton>
                }
            >
                <ActionButton
                    type="button"
                    variant="outline"
                    onClick={() => history.push('documents')}
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

            <ReviewSubmitModal
                draftSubmission={draftSubmission}
                submissionName={submissionName}
                unlocked={unlocked}
                modalRef={modalRef}
                showError={showError}
                isSubmitting={setIsSubmitting}
            />
        </GridContainer>
    )
}
