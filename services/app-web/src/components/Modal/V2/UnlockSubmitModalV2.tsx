import React, { useEffect, useState } from 'react'
import { FormGroup, ModalRef, Textarea } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import {
    Rate,
    Contract,
    useSubmitContractMutation,
    useUnlockContractMutation,
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchContractDocument,
} from '../../../gen/gqlClient'
import { useFormik } from 'formik'
import { usePrevious } from '../../../hooks/usePrevious'
import { Modal } from '../Modal'
import { PoliteErrorMessage } from '../../PoliteErrorMessage'
import * as Yup from 'yup'
import styles from '../UnlockSubmitModal.module.scss'
import { GenericApiErrorProps } from '../../Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ERROR_MESSAGES } from '../../../constants/errors'
import {
    submitMutationWrapperV2,
    unlockMutationWrapperV2,
} from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'

const RATE_UNLOCK_SUBMIT_TYPES = [
    'SUBMIT_RATE',
    'RESUBMIT_RATE',
    'UNLOCK_RATE',
] as const
const CONTRACT_UNLOCK_SUBMIT_TYPES = [
    'SUBMIT_CONTRACT',
    'RESUBMIT_CONTRACT',
    'UNLOCK_CONTRACT',
] as const

type RateModalType = (typeof RATE_UNLOCK_SUBMIT_TYPES)[number]
type ContractModalType = (typeof CONTRACT_UNLOCK_SUBMIT_TYPES)[number]
type SharedModalType = ContractModalType & RateModalType
type SharedAdditionalProps = {
    submissionName?: string
    modalRef: React.RefObject<ModalRef>
    setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>
}

type RateModalProps = {
    submissionData: Rate
    modalType: RateModalType
} & SharedAdditionalProps

type ContractModalProps = {
    submissionData: Contract
    modalType: ContractModalType
} & SharedAdditionalProps

type UnlockSubmitModalProps = RateModalProps | ContractModalProps

type ModalValueType = {
    modalHeading?: string
    onSubmitText?: string
    modalDescription?: string
    inputHint?: string
    unlockSubmitModalInputValidation?: string
    errorHeading: string
    errorSuggestion?: string
}

const modalValueDictionary: { [Property in SharedModalType]: ModalValueType } =
    {
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
    }

export const UnlockSubmitModal = ({
    submissionData,
    submissionName,
    modalType,
    modalRef,
    setIsSubmitting,
}: UnlockSubmitModalProps): React.ReactElement | null => {
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const [modalAlert, setModalAlert] = useState<
        GenericApiErrorProps | undefined
    >(undefined)
    const navigate = useNavigate()

    const modalValues: ModalValueType =
        modalValueDictionary[modalType as SharedModalType]

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
    const includesFormInput =
        modalType === 'UNLOCK_CONTRACT' ||
        modalType === 'RESUBMIT_CONTRACT' ||
        modalType === 'UNLOCK_RATE' ||
        modalType === 'RESUBMIT_RATE'

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
                result = await submitMutationWrapperV2(
                    submitContract,
                    submissionData.id,
                    unlockSubmitModalInput
                )
                break
            case 'RESUBMIT_CONTRACT':
                result = await submitMutationWrapperV2(
                    submitContract,
                    submissionData.id,
                    unlockSubmitModalInput
                )
                break
            case 'UNLOCK_CONTRACT':
                if (unlockSubmitModalInput) {
                    result = await unlockMutationWrapperV2(
                        unlockContract,
                        submissionData.id,
                        unlockSubmitModalInput
                    )
                } else {
                    console.info('error has occured with unlocking contract')
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
                    include: [FetchContractDocument],
                })
                // TODO: Remove HPP code fully from here, this is a hack to get through linked rates
                // neded because sidebar UI that also displays questions that assumes latest data fetched on this page
                // and we haven't had to migrate that yet to contract and ratesyet
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
            if (
                (modalType === 'RESUBMIT_CONTRACT' ||
                    modalType === 'SUBMIT_CONTRACT') &&
                submissionName
            ) {
                navigate(
                    `/dashboard/submissions?justSubmitted=${submissionName}`
                )
            } else {
                await client.refetchQueries({
                    include: [FetchContractDocument],
                })
                // TODO: Remove HPP code fully from here, this is a hack to get through linked rates
                // neded because sidebar UI that also displays questions that assumes latest data fetched on this page
                // and we haven't had to migrate that yet to contract and ratesyet
                await client.refetchQueries({
                    include: [FetchHealthPlanPackageWithQuestionsDocument],
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
