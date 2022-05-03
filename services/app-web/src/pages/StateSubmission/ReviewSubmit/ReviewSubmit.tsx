import {
    Alert,
    FormGroup,
    GridContainer,
    ModalRef,
    ModalToggleButton,
    Textarea,
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
    SupportingDocumentsSummarySection,
} from '../../../components/SubmissionSummarySection'
import { useAuth } from '../../../contexts/AuthContext'
import { useSubmitHealthPlanPackageMutation } from '../../../gen/gqlClient'
import { PageActionsContainer } from '../PageActions'
import { Modal } from '../../../components/Modal'
import styles from './ReviewSubmit.module.scss'
import { PoliteErrorMessage } from '../../../components'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { UnlockedHealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { ActionButton } from '../../../components/ActionButton'

export const ReviewSubmit = ({
    draftSubmission,
    unlocked,
    submissionName,
}: {
    draftSubmission: UnlockedHealthPlanFormDataType
    unlocked: boolean
    submissionName: string
}): React.ReactElement => {
    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const history = useHistory()
    const modalRef = useRef<ModalRef>(null)
    const { loggedInUser } = useAuth()

    // pull the programs off the user
    const statePrograms =
        (loggedInUser &&
            'state' in loggedInUser &&
            loggedInUser.state.programs) ||
        []

    const [submitDraftSubmission, { loading: submitMutationLoading }] =
        useSubmitHealthPlanPackageMutation()

    const showError = (error: string) => {
        setUserVisibleError(error)
    }

    const modalFormInitialValues = {
        submittedReason: '',
    }

    const formik = useFormik({
        initialValues: modalFormInitialValues,
        validationSchema: Yup.object().shape({
            submittedReason: Yup.string().defined(
                'You must provide a summary of changes'
            ),
        }),
        onSubmit: (values) => onModalSubmit(values),
    })

    const submitHandler = async () => {
        setFocusErrorsInModal(true)
        if (unlocked) {
            formik.handleSubmit()
        } else {
            await onSubmit(undefined)
        }
    }

    const onModalSubmit = async (values: typeof modalFormInitialValues) => {
        const { submittedReason } = values
        await onSubmit(submittedReason)
    }

    const onSubmit = async (
        submittedReason: string | undefined
    ): Promise<void> => {
        const input = { pkgID: draftSubmission.id }

        if (unlocked) {
            Object.assign(input, {
                submittedReason: submittedReason,
            })
        }

        try {
            const data = await submitDraftSubmission({
                variables: {
                    input: input,
                },
            })

            if (data.errors) {
                showError('Error attempting to submit. Please try again.')
                modalRef.current?.toggleModal(undefined, false)
            }

            if (data.data?.submitHealthPlanPackage) {
                modalRef.current?.toggleModal(undefined, false)
                history.push(`/dashboard?justSubmitted=${submissionName}`)
            } else {
                console.error('Got nothing back from submit')
                showError('Error attempting to submit. Please try again.')
                modalRef.current?.toggleModal(undefined, false)
            }
        } catch (error) {
            showError('Error attempting to submit. Please try again.')
            modalRef.current?.toggleModal(undefined, false)
        }
    }

    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'

    // Focus submittedReason field in submission modal on Resubmit click when errors exist
    useEffect(() => {
        if (focusErrorsInModal && formik.errors.submittedReason) {
            const fieldElement: HTMLElement | null = document.querySelector(
                `[name="submittedReason"]`
            )

            if (fieldElement) {
                fieldElement.focus()
                setFocusErrorsInModal(false)
            } else {
                console.log('Attempting to focus element that does not exist')
            }
        }
    }, [focusErrorsInModal, formik.errors])

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
            />

            {isContractActionAndRateCertification && (
                <RateDetailsSummarySection
                    submission={draftSubmission}
                    navigateTo="rate-details"
                    submissionName={submissionName}
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
                        disabled={formik.isSubmitting}
                    >
                        Save as draft
                    </ActionButton>
                }
            >
                <ActionButton
                    type="button"
                    variant="outline"
                    onClick={() => history.push('documents')}
                    disabled={formik.isSubmitting}
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

            <Modal
                modalRef={modalRef}
                id="review-and-submit"
                modalHeading={
                    unlocked ? 'Summarize changes' : 'Ready to submit?'
                }
                submitButtonProps={{ className: styles.submitButton }}
                onSubmitText={unlocked ? 'Resubmit' : undefined}
                onSubmit={submitHandler}
                isSubmitting={formik.isSubmitting || submitMutationLoading}
            >
                {unlocked ? (
                    <form>
                        <p>
                            Once you submit, this package will be sent to CMS
                            for review and you will no longer be able to make
                            changes.
                        </p>
                        <FormGroup
                            error={Boolean(formik.errors.submittedReason)}
                        >
                            {formik.errors.submittedReason && (
                                <PoliteErrorMessage role="alert">
                                    {formik.errors.submittedReason}
                                </PoliteErrorMessage>
                            )}
                            <span id="submittedReason-hint" role="note">
                                Provide summary of all changes made to this
                                submission
                            </span>
                            <Textarea
                                id="submittedReasonCharacterCount"
                                name="submittedReason"
                                data-testid="submittedReason"
                                aria-labelledby="submittedReason-hint"
                                className={styles.submittedReasonTextarea}
                                aria-required
                                error={!!formik.errors.submittedReason}
                                onChange={formik.handleChange}
                                defaultValue={formik.values.submittedReason}
                            />
                        </FormGroup>
                    </form>
                ) : (
                    <p>
                        Submitting this package will send it to CMS to begin
                        their review.
                    </p>
                )}
            </Modal>
        </GridContainer>
    )
}
