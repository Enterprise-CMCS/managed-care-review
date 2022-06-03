import React, { useEffect, useState } from 'react'
import styles from './ReviewSubmit.module.scss'
import { Alert, FormGroup, ModalRef, Textarea } from '@trussworks/react-uswds'
import { Modal, PoliteErrorMessage } from '../../../components'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { UnlockedHealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { useNavigate } from 'react-router-dom'
import { useSubmitHealthPlanPackageMutation } from '../../../gen/gqlClient'
import { usePrevious } from '../../../hooks/usePrevious'

export const ReviewSubmitModal = ({
    draftSubmission,
    submissionName,
    unlocked,
    modalRef,
    setIsSubmitting,
}: {
    draftSubmission: UnlockedHealthPlanFormDataType
    submissionName: string
    unlocked: boolean
    modalRef: React.RefObject<ModalRef>
    setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
}): React.ReactElement => {
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const [modalAlert, setModalAlert] = useState<string | null>(null) // when api errors error
    const navigate = useNavigate()

    const [submitDraftSubmission, { loading: submitMutationLoading }] =
        useSubmitHealthPlanPackageMutation()

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

    const prevSubmitting = usePrevious(
        formik.isSubmitting || submitMutationLoading
    )

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
                setModalAlert('Error attempting to submit. Please try again.')
            }

            if (data.data?.submitHealthPlanPackage) {
                modalRef.current?.toggleModal(undefined, false)
                navigate(`/dashboard?justSubmitted=${submissionName}`)
            } else {
                setModalAlert('Error attempting to submit. Please try again.')
            }
        } catch (error) {
            setModalAlert('Error attempting to submit. Please try again.')
        }
    }

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

    useEffect(() => {
        const isSubmitting = formik.isSubmitting || submitMutationLoading
        if (prevSubmitting !== isSubmitting && prevSubmitting !== undefined) {
            setIsSubmitting(isSubmitting)
        }
    }, [
        formik.isSubmitting,
        submitMutationLoading,
        setIsSubmitting,
        prevSubmitting,
    ])

    return (
        <Modal
            modalRef={modalRef}
            id="review-and-submit"
            modalHeading={unlocked ? 'Summarize changes' : 'Ready to submit?'}
            submitButtonProps={{ className: styles.submitButton }}
            onSubmitText={unlocked ? 'Resubmit' : undefined}
            onSubmit={submitHandler}
            isSubmitting={formik.isSubmitting || submitMutationLoading}
        >
            {modalAlert && (
                <Alert type="error" heading="Submission Error">
                    {modalAlert}
                </Alert>
            )}
            {unlocked ? (
                <form>
                    <p>
                        Once you submit, this package will be sent to CMS for
                        review and you will no longer be able to make changes.
                    </p>
                    <FormGroup error={Boolean(formik.errors.submittedReason)}>
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
                    Submitting this package will send it to CMS to begin their
                    review.
                </p>
            )}
        </Modal>
    )
}
