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
import stylesSubmissionForm from '../StateSubmissionForm.module.scss'
import { ActionButton } from '../../../components/ActionButton'
import { UnlockSubmitModal } from '../../../components/Modal/UnlockSubmitModal'
import { useStatePrograms } from '../../../hooks/useStatePrograms'
import { RoutesRecord } from '../../../constants'
import { FormContainer } from '../FormContainer'
import { useAuth } from '../../../contexts/AuthContext'
import {
    useCurrentRoute,
    useHealthPlanPackageForm,
    useRouteParams,
} from '../../../hooks'
import { DynamicStepIndicator } from '../../../components'
import { activeFormPages } from '../StateSubmissionForm'
import { PageBannerAlerts } from '../PageBannerAlerts'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'

export const ReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    // set up API handling and HPP data
    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id } = useRouteParams()
    const {
        draftSubmission,
        interimState,
        showPageErrorMessage,
        unlockInfo,
        documentDateLookupTable,
        submissionName,
    } = useHealthPlanPackageForm(id)

    const statePrograms = useStatePrograms()

    if (
        !draftSubmission ||
        !submissionName ||
        !documentDateLookupTable ||
        interimState
    )
        return <ErrorOrLoadingPage state={interimState ?? 'GENERIC_ERROR'} />

    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <>
            <div className={stylesSubmissionForm.stepIndicator}>
                <DynamicStepIndicator
                    formPages={activeFormPages(draftSubmission)}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                />
            </div>

            <FormContainer id="ReviewSubmit">
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
                            modalType={unlockInfo ? 'RESUBMIT' : 'SUBMIT'}
                            modalRef={modalRef}
                            setIsSubmitting={setIsSubmitting}
                        />
                    }
                </GridContainer>
            </FormContainer>
        </>
    )
}
