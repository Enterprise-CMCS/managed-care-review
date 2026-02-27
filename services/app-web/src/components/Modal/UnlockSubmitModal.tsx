import React, { useEffect, useState } from 'react'
import { FormGroup, ModalRef, Textarea } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import {
    Rate,
    Contract,
    useSubmitContractMutation,
    useUnlockContractMutation,
    FetchContractWithQuestionsDocument,
} from '../../gen/gqlClient'
import { useFormik } from 'formik'
import { usePrevious } from '../../hooks'
import { Modal } from './Modal'
import { PoliteErrorMessage } from '../PoliteErrorMessage'
import * as Yup from 'yup'
import { GenericApiErrorProps } from '../Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ERROR_MESSAGES } from '@mc-review/constants'
import {
    submitMutationWrapper,
    unlockMutationWrapper,
} from '@mc-review/helpers'
import { useTealium } from '../../hooks'
import {
    EQROModalDescription,
    EQROResubmitModalDescription,
} from './ModalBodyContent'

type ModalTypes =
    | 'SUBMIT_RATE'
    | 'RESUBMIT_RATE'
    | 'RESUBMIT_EQRO_CONTRACT'
    | 'UNLOCK_RATE'
    | 'SUBMIT_CONTRACT'
    | 'RESUBMIT_CONTRACT'
    | 'UNLOCK_CONTRACT'
    | 'SUBMIT_EQRO_CONTRACT'

type UnlockSubmitModalProps = {
    submissionData: Rate | Contract
    modalType: ModalTypes
    submissionName?: string
    modalRef: React.RefObject<ModalRef>
    setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>
}

type ModalValueType = {
    modalHeading?: string
    onSubmitText?: string
    modalDescription?: string | React.ReactElement
    inputHint?: string
    unlockSubmitModalInputValidation?: string
    errorHeading: string
    errorSuggestion?: string
}

const modalValueDictionary: Record<ModalTypes, ModalValueType> = {
    RESUBMIT_RATE: {
        modalHeading: 'Summarize changes',
        onSubmitText: 'Resubmit',
        modalDescription:
            'Once you submit, this rate will be sent to CMS for review and you will no longer be able to make changes.',
        inputHint: 'Provide summary of all changes made to this rate',
        unlockSubmitModalInputValidation:
            'You must provide a summary of changes',
        errorHeading: ERROR_MESSAGES.resubmit_error_heading,
    },
    RESUBMIT_CONTRACT: {
        modalHeading: 'Summarize changes',
        onSubmitText: 'Resubmit',
        modalDescription:
            'Once you submit, this contract will be sent to CMS for review and you will no longer be able to make changes.',
        inputHint: 'Provide summary of all changes made to this contract',
        unlockSubmitModalInputValidation:
            'You must provide a summary of changes',
        errorHeading: ERROR_MESSAGES.resubmit_error_heading,
    },
    RESUBMIT_EQRO_CONTRACT: {
        modalHeading: 'Summarize changes',
        onSubmitText: 'Resubmit',
        errorHeading: ERROR_MESSAGES.submit_error_heading,
        errorSuggestion: ERROR_MESSAGES.submit_error_suggestion,
        modalDescription: EQROResubmitModalDescription,
    },
    UNLOCK_RATE: {
        modalHeading: 'Reason for unlocking rate',
        onSubmitText: 'Unlock',
        inputHint: 'Provide reason for unlocking',
        unlockSubmitModalInputValidation:
            'You must provide a reason for unlocking this rate',
        errorHeading: ERROR_MESSAGES.unlock_error_heading,
    },
    UNLOCK_CONTRACT: {
        modalHeading: 'Reason for unlocking submission',
        onSubmitText: 'Unlock',
        inputHint: 'Provide reason for unlocking',
        unlockSubmitModalInputValidation:
            'You must provide a reason for unlocking this submission',
        errorHeading: ERROR_MESSAGES.unlock_error_heading,
    },
    SUBMIT_RATE: {
        modalHeading: 'Ready to submit?',
        onSubmitText: 'Submit',
        modalDescription:
            'Submitting this rate will send it to CMS to begin their review.',
        errorHeading: ERROR_MESSAGES.submit_error_heading,
        errorSuggestion: ERROR_MESSAGES.submit_error_suggestion,
    },
    SUBMIT_CONTRACT: {
        modalHeading: 'Ready to submit?',
        onSubmitText: 'Submit',
        modalDescription:
            'Submitting this contract will send it to CMS to begin their review.',
        errorHeading: ERROR_MESSAGES.submit_error_heading,
        errorSuggestion: ERROR_MESSAGES.submit_error_suggestion,
    },
    SUBMIT_EQRO_CONTRACT: {
        modalHeading: 'Ready to submit?',
        onSubmitText: 'Submit',
        errorHeading: ERROR_MESSAGES.submit_error_heading,
        errorSuggestion: ERROR_MESSAGES.submit_error_suggestion,
        modalDescription: EQROModalDescription,
    },
} satisfies Record<ModalTypes, ModalValueType>

export const UnlockSubmitModal = ({
    submissionData,
    submissionName,
    modalType,
    modalRef,
    setIsSubmitting,
}: UnlockSubmitModalProps): React.ReactElement | null => {
    const { logFormSubmitEvent } = useTealium()
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const [modalAlert, setModalAlert] = useState<
        GenericApiErrorProps | undefined
    >(undefined)
    const navigate = useNavigate()

    const modalValues: ModalValueType = modalValueDictionary[modalType]

    const modalFormInitialValues = {
        unlockSubmitModalInput: '',
    }

    const [submitContract, { loading: submitContractLoading }] =
        useSubmitContractMutation()

    const [unlockContract, { loading: unlockContractLoading, client }] =
        useUnlockContractMutation()

    // TODO submitRate and unlockRate should also be set up here - unlock and edit rate epic
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
        modalType === 'UNLOCK_CONTRACT'
            ? unlockContractLoading
            : submitContractLoading

    const isSubmitting = mutationLoading || formik.isSubmitting
    const includesFormInput = ![
        'SUBMIT_CONTRACT',
        'SUBMIT_RATE',
        'SUBMIT_EQRO_CONTRACT',
    ].includes(modalType)

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

        logFormSubmitEvent({
            heading: modalValues.modalHeading ?? 'unknown',
            form_name: modalType.toLowerCase(),
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })

        switch (modalType) {
            case 'UNLOCK_RATE':
                console.info('unlock rate not implemented yet')
                break

            case 'SUBMIT_RATE':
                console.info('submit rate not implemented yet')
                break
            case 'RESUBMIT_RATE':
                console.info('submit rate not implemented yet')
                break
            case 'SUBMIT_CONTRACT':
            case 'SUBMIT_EQRO_CONTRACT':
                result = await submitMutationWrapper(
                    submitContract,
                    submissionData.id,
                    unlockSubmitModalInput
                )
                break
            case 'RESUBMIT_CONTRACT':
                result = await submitMutationWrapper(
                    submitContract,
                    submissionData.id,
                    unlockSubmitModalInput
                )
                break
            case 'RESUBMIT_EQRO_CONTRACT':
                result = await submitMutationWrapper(
                    submitContract,
                    submissionData.id,
                    unlockSubmitModalInput
                )
                break
            case 'UNLOCK_CONTRACT':
                if (unlockSubmitModalInput) {
                    result = await unlockMutationWrapper(
                        unlockContract,
                        submissionData.id,
                        unlockSubmitModalInput
                    )
                } else {
                    console.info('error has occurred with unlocking contract')
                }

                break
        }

        //Allow submitting/unlocking to continue on EMAIL_ERROR.
        if (result instanceof Error && result.cause === 'EMAIL_ERROR') {
            modalRef.current?.toggleModal(undefined, false)

            if (modalType !== 'UNLOCK_CONTRACT' && submissionName) {
                navigate(
                    `/dashboard/submissions?justSubmitted=${submissionName}`
                )
            } else {
                await client.refetchQueries({
                    include: [FetchContractWithQuestionsDocument],
                })
            }
        } else if (result instanceof Error) {
            setModalAlert({
                heading: modalValues.errorHeading,
                message: result.message,
                // When we have generic/unknown errors override any suggestions and display the fallback "please refresh text"
                validationFail:
                    result.message === ERROR_MESSAGES.submit_missing_field,
            })
        } else {
            modalRef.current?.toggleModal(undefined, false)
            if (
                [
                    'RESUBMIT_CONTRACT',
                    'RESUBMIT_EQRO_CONTRACT',
                    'SUBMIT_CONTRACT',
                    'SUBMIT_EQRO_CONTRACT',
                ].includes(modalType) &&
                submissionName &&
                submissionData.__typename === 'Contract'
            ) {
                navigate(
                    `/dashboard/submissions?justSubmitted=${submissionName}&contractType=${submissionData.contractSubmissionType}&id=${submissionData.id}`
                )
            } else {
                await client.refetchQueries({
                    include: [FetchContractWithQuestionsDocument],
                })
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
                <form tabIndex={0}>
                    {modalValues.modalDescription && (
                        <p>{modalValues.modalDescription}</p>
                    )}
                    <FormGroup
                        error={Boolean(formik.errors.unlockSubmitModalInput)}
                    >
                        {formik.errors.unlockSubmitModalInput && (
                            <PoliteErrorMessage
                                formFieldLabel={
                                    modalValues.modalHeading ?? modalType
                                }
                                role="alert"
                            >
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
                            aria-labelledby="modal-input-hint"
                            aria-required
                            error={!!formik.errors.unlockSubmitModalInput}
                            onChange={formik.handleChange}
                            defaultValue={formik.values.unlockSubmitModalInput}
                        />
                    </FormGroup>
                </form>
            ) : typeof modalValues.modalDescription === 'string' ? (
                <p>{modalValues.modalDescription}</p>
            ) : (
                modalValues.modalDescription
            )}
        </Modal>
    )
}
