import { UnlockedHealthPlanFormDataType } from '../../common-code/healthPlanFormDataType'
import React, { useEffect, useState } from 'react'
import { FormGroup, ModalRef, Textarea } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import {
    HealthPlanPackage,
    useSubmitHealthPlanPackageMutation,
    useUnlockHealthPlanPackageMutation,
} from '../../gen/gqlClient'
import { submitMutationWrapper, unlockMutationWrapper } from '../../gqlHelpers'
import { useFormik } from 'formik'
import { usePrevious } from '../../hooks/usePrevious'
import { Modal } from './Modal'
import styles from './UnlockSubmitModal.module.scss'
import { PoliteErrorMessage } from '../PoliteErrorMessage'
import * as Yup from 'yup'

type ModalType = 'SUBMIT' | 'RESUBMIT' | 'UNLOCK'

type ModalValueType = {
    modalHeading?: string
    onSubmitText?: string
    modalDescription?: string
    inputHint?: string
    modalInputValidationText?: string
}

const modalValueDictionary: { [Property in ModalType]: ModalValueType } = {
    RESUBMIT: {
        modalHeading: 'Summarize changes',
        onSubmitText: 'Resubmit',
        modalDescription:
            'Once you submit, this package will be sent to CMS for review and you will no longer be able to make changes.',
        inputHint: 'Provide summary of all changes made to this submission',
        modalInputValidationText: 'You must provide a summary of changes',
    },
    UNLOCK: {
        modalHeading: 'Reason for unlocking submission',
        onSubmitText: 'Unlock',
        inputHint: 'Provide reason for unlocking',
        modalInputValidationText:
            'You must provide a reason for unlocking this submission',
    },
    SUBMIT: {
        modalHeading: 'Ready to submit?',
        onSubmitText: 'Submit',
        modalDescription:
            'Submitting this package will send it to CMS to begin their review.',
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
    const [modalAlert, setModalAlert] = useState<string | undefined>(undefined) // when api errors error
    const navigate = useNavigate()
    const modalValues: ModalValueType = modalValueDictionary[modalType]

    const modalFormInitialValues = {
        modalInput: '',
    }

    const [submitHealthPlanPackage, { loading: submitMutationLoading }] =
        useSubmitHealthPlanPackageMutation()
    const [unlockHealthPlanPackage, { loading: unlockMutationLoading }] =
        useUnlockHealthPlanPackageMutation()

    const formik = useFormik({
        initialValues: modalFormInitialValues,
        validationSchema: Yup.object().shape({
            modalInput: Yup.string().defined(
                modalValues.modalInputValidationText
            ),
        }),
        onSubmit: (values) => onSubmit(values.modalInput),
    })

    const mutationLoading =
        modalType === 'UNLOCK' ? unlockMutationLoading : submitMutationLoading
    const isSubmitting = mutationLoading || formik.isSubmitting

    const prevSubmitting = usePrevious(isSubmitting)

    const submitHandler = async () => {
        setFocusErrorsInModal(true)
        if (modalType === 'UNLOCK' || modalType === 'RESUBMIT') {
            formik.handleSubmit()
        } else {
            await onSubmit()
        }
    }

    const onSubmit = async (modalInput?: string): Promise<void> => {
        let result
        if (modalType === 'UNLOCK' && modalInput) {
            result = await unlockMutationWrapper(
                unlockHealthPlanPackage,
                healthPlanPackage.id,
                modalInput
            )
        } else {
            result = await submitMutationWrapper(
                submitHealthPlanPackage,
                healthPlanPackage.id,
                modalInput
            )
        }

        if (result instanceof Error) {
            setModalAlert(result.message)
        } else {
            modalRef.current?.toggleModal(undefined, false)
            if (modalType !== 'UNLOCK' && submissionName) {
                navigate(`/dashboard?justSubmitted=${submissionName}`)
            }
        }
    }

    // Focus submittedReason field in submission modal on Resubmit click when errors exist
    useEffect(() => {
        if (focusErrorsInModal && formik.errors.modalInput) {
            const fieldElement: HTMLElement | null =
                document.querySelector(`[name="modalInput"]`)
            if (fieldElement) {
                fieldElement.focus()
                setFocusErrorsInModal(false)
            } else {
                console.log('Attempting to focus element that does not exist')
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
            {modalType === 'RESUBMIT' || modalType === 'UNLOCK' ? (
                <form>
                    {modalValues.modalDescription && (
                        <p>{modalValues.modalDescription}</p>
                    )}
                    <FormGroup error={Boolean(formik.errors.modalInput)}>
                        {formik.errors.modalInput && (
                            <PoliteErrorMessage role="alert">
                                {formik.errors.modalInput}
                            </PoliteErrorMessage>
                        )}
                        {modalValues.inputHint && (
                            <span id="modal-input-hint" role="note">
                                {modalValues.inputHint}
                            </span>
                        )}
                        <Textarea
                            id="modalInputCharacterCount"
                            name="modalInput"
                            data-testid="modalInput"
                            aria-labelledby="modal-input-hint"
                            className={styles.modalInputTextarea}
                            aria-required
                            error={!!formik.errors.modalInput}
                            onChange={formik.handleChange}
                            defaultValue={formik.values.modalInput}
                        />
                    </FormGroup>
                </form>
            ) : (
                <p>{modalValues.modalDescription}</p>
            )}
        </Modal>
    )
}
