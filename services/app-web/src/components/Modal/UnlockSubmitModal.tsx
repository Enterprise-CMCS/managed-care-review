import { UnlockedHealthPlanFormDataType } from '../../common-code/healthPlanFormDataType'
import React, { useEffect, useState } from 'react'
import { FormGroup, ModalRef, Textarea } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import {
    FetchHealthPlanPackageWithQuestionsDocument,
    HealthPlanPackage,
    useSubmitHealthPlanPackageMutation,
    useUnlockHealthPlanPackageMutation,
} from '../../gen/gqlClient'
import { submitMutationWrapper, unlockMutationWrapper } from '../../gqlHelpers'
import { useFormik } from 'formik'
import { usePrevious } from '../../hooks/usePrevious'
import { Modal } from './Modal'
import { PoliteErrorMessage } from '../PoliteErrorMessage'
import * as Yup from 'yup'
import styles from './UnlockSubmitModal.module.scss'
import { GenericApiErrorProps } from '../Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ERROR_MESSAGES } from '../../constants/errors'

type ModalType = 'SUBMIT' | 'RESUBMIT' | 'UNLOCK'

type ModalValueType = {
    modalHeading?: string
    onSubmitText?: string
    modalDescription?: string
    inputHint?: string
    unlockSubmitModalInputValidation?: string
    errorHeading: string
    errorSuggestion?: string
}

const modalValueDictionary: { [Property in ModalType]: ModalValueType } = {
    RESUBMIT: {
        modalHeading: 'Summarize changes',
        onSubmitText: 'Resubmit',
        modalDescription:
            'Once you submit, this package will be sent to CMS for review and you will no longer be able to make changes.',
        inputHint: 'Provide summary of all changes made to this submission',
        unlockSubmitModalInputValidation:
            'You must provide a summary of changes',
        errorHeading: ERROR_MESSAGES.resubmit_error_heading,
    },
    UNLOCK: {
        modalHeading: 'Reason for unlocking submission',
        onSubmitText: 'Unlock',
        inputHint: 'Provide reason for unlocking',
        unlockSubmitModalInputValidation:
            'You must provide a reason for unlocking this submission',
        errorHeading: ERROR_MESSAGES.unlock_error_heading,
    },
    SUBMIT: {
        modalHeading: 'Ready to submit?',
        onSubmitText: 'Submit',
        modalDescription:
            'Submitting this package will send it to CMS to begin their review.',
        errorHeading: ERROR_MESSAGES.submit_error_heading,
        errorSuggestion: ERROR_MESSAGES.submit_error_suggestion,
    },
}

export const UnlockSubmitModal = ({
    healthPlanPackage,
    submissionName,
    modalType,
    modalRef,
    setIsSubmitting,
}: {
    healthPlanPackage: UnlockedHealthPlanFormDataType | HealthPlanPackage
    submissionName?: string
    modalType: ModalType
    modalRef: React.RefObject<ModalRef>
    setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>
}): React.ReactElement => {
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const [modalAlert, setModalAlert] = useState<
        GenericApiErrorProps | undefined
    >(undefined) // when api errors error
    const navigate = useNavigate()
    const modalValues: ModalValueType = modalValueDictionary[modalType]

    const modalFormInitialValues = {
        unlockSubmitModalInput: '',
    }

    const [submitHealthPlanPackage, { loading: submitMutationLoading }] =
        useSubmitHealthPlanPackageMutation()
    const [
        unlockHealthPlanPackage,
        { loading: unlockMutationLoading, client },
    ] = useUnlockHealthPlanPackageMutation()

    const formik = useFormik({
        initialValues: modalFormInitialValues,
        validationSchema: Yup.object().shape({
            unlockSubmitModalInput: Yup.string().defined(
                modalValues.unlockSubmitModalInputValidation
            ),
        }),
        onSubmit: (values) => onSubmit(values.unlockSubmitModalInput),
    })

    const mutationLoading =
        modalType === 'UNLOCK' ? unlockMutationLoading : submitMutationLoading
    const isSubmitting = mutationLoading || formik.isSubmitting
    const includesFormInput = modalType === 'UNLOCK' || modalType === 'RESUBMIT'

    const prevSubmitting = usePrevious(isSubmitting)

    const submitHandler = async () => {
        setFocusErrorsInModal(true)
        if (includesFormInput) {
            formik.handleSubmit()
        } else {
            await onSubmit()
        }
    }

    const onSubmit = async (unlockSubmitModalInput?: string): Promise<void> => {
        let result
        if (modalType === 'UNLOCK' && unlockSubmitModalInput) {
            result = await unlockMutationWrapper(
                unlockHealthPlanPackage,
                healthPlanPackage.id,
                unlockSubmitModalInput
            )
        } else {
            result = await submitMutationWrapper(
                submitHealthPlanPackage,
                healthPlanPackage.id,
                unlockSubmitModalInput
            )
        }

        //Allow submitting/unlocking to continue on EMAIL_ERROR.
        if (result instanceof Error && result.cause === 'EMAIL_ERROR') {
            modalRef.current?.toggleModal(undefined, false)

            if (modalType !== 'UNLOCK' && submissionName) {
                navigate(
                    `/dashboard/submissions?justSubmitted=${submissionName}`
                )
            } else {
                await client.refetchQueries({
                    include: [FetchHealthPlanPackageWithQuestionsDocument],
                })
            }
        } else if (result instanceof Error) {
            setModalAlert({
                heading: modalValues.errorHeading,
                message: result.message,
                // When we have generic/unknown errors override any suggestions and display the fallback "please refresh text"
                suggestion:
                    result.message === ERROR_MESSAGES.submit_error_generic ||
                    result.message === ERROR_MESSAGES.unlock_error_generic
                        ? undefined
                        : modalValues.errorSuggestion,
            })
        } else {
            modalRef.current?.toggleModal(undefined, false)
            if (modalType !== 'UNLOCK' && submissionName) {
                navigate(
                    `/dashboard/submissions?justSubmitted=${submissionName}`
                )
            }
        }
    }

    // Focus submittedReason field in submission modal on Resubmit click when errors exist
    useEffect(() => {
        if (focusErrorsInModal && formik.errors.unlockSubmitModalInput) {
            const fieldElement: HTMLElement | null = document.querySelector(
                `[name="unlockSubmitModalInput"]`
            )
            if (fieldElement) {
                fieldElement.focus()
                setFocusErrorsInModal(false)
            } else {
                console.info('Attempting to focus element that does not exist')
            }
        }
    }, [focusErrorsInModal, formik.errors])

    useEffect(() => {
        if (
            prevSubmitting !== isSubmitting &&
            prevSubmitting !== undefined &&
            setIsSubmitting
        ) {
            setIsSubmitting(isSubmitting)
        }
    }, [isSubmitting, setIsSubmitting, prevSubmitting])

    return (
        <Modal
            modalRef={modalRef}
            id={modalType.toLocaleLowerCase()}
            modalHeading={modalValues.modalHeading}
            onSubmitText={modalValues.onSubmitText}
            onSubmit={submitHandler}
            isSubmitting={isSubmitting}
            modalAlert={modalAlert}
        >
            {includesFormInput ? (
                <form>
                    {modalValues.modalDescription && (
                        <p>{modalValues.modalDescription}</p>
                    )}
                    <FormGroup
                        error={Boolean(formik.errors.unlockSubmitModalInput)}
                    >
                        {formik.errors.unlockSubmitModalInput && (
                            <PoliteErrorMessage role="alert">
                                {formik.errors.unlockSubmitModalInput}
                            </PoliteErrorMessage>
                        )}
                        {modalValues.inputHint && (
                            <span id="modal-input-hint" role="note">
                                {modalValues.inputHint}
                            </span>
                        )}
                        <Textarea
                            id="unlockSubmitModalInput"
                            name="unlockSubmitModalInput"
                            data-testid="unlockSubmitModalInput"
                            aria-labelledby="unlock-submit-modal-input-hint"
                            className={styles.modalInputTextarea}
                            aria-required
                            error={!!formik.errors.unlockSubmitModalInput}
                            onChange={formik.handleChange}
                            defaultValue={formik.values.unlockSubmitModalInput}
                        />
                    </FormGroup>
                </form>
            ) : (
                <p>{modalValues.modalDescription}</p>
            )}
        </Modal>
    )
}
