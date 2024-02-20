import { UnlockedHealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import React, { useEffect, useState } from 'react'
import { FormGroup, ModalRef, Textarea } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import {
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchHealthPlanPackageDocument,
    HealthPlanPackage,
    useSubmitHealthPlanPackageMutation,
    useUnlockHealthPlanPackageMutation,
    Rate,
} from '../../../gen/gqlClient'
import {
    submitMutationWrapper,
    unlockMutationWrapper,
} from '../../../gqlHelpers'
import { useFormik } from 'formik'
import { usePrevious } from '../../../hooks/usePrevious'
import { Modal } from '../Modal'
import { PoliteErrorMessage } from '../../PoliteErrorMessage'
import * as Yup from 'yup'
import styles from './UnlockSubmitModal.module.scss'
import { GenericApiErrorProps } from '../../Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ERROR_MESSAGES } from '../../../constants/errors'
import { useAuth } from '../../../contexts/AuthContext'

const PACKAGE_UNLOCK_SUBMIT_TYPES = [
    'SUBMIT_PACKAGE',
    'RESUBMIT_PACKAGE',
    'UNLOCK_PACKAGE',
] as const
const RATE_UNLOCK_SUBMIT_TYPES = [
    'SUBMIT_RATE',
    'RESUBMIT_RATE',
    'UNLOCK_RATE',
] as const
type PackageModalType = (typeof PACKAGE_UNLOCK_SUBMIT_TYPES)[number]
type RateModalType = (typeof RATE_UNLOCK_SUBMIT_TYPES)[number]
type SharedModalType = PackageModalType & RateModalType
type SharedAdditionalProps = {
    submissionName?: string
    modalRef: React.RefObject<ModalRef>
    setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>
}

type RateModalProps = {
    submissionData: Rate
    modalType: RateModalType[number]
} & SharedAdditionalProps

type PackageModalProps = {
    submissionData: UnlockedHealthPlanFormDataType | HealthPlanPackage
    modalType: PackageModalType
} & SharedAdditionalProps

type UnlockSubmitModalProps = PackageModalProps | RateModalProps

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
        RESUBMIT_PACKAGE: {
            modalHeading: 'Summarize changes',
            onSubmitText: 'Resubmit',
            modalDescription:
                'Once you submit, this package will be sent to CMS for review and you will no longer be able to make changes.',
            inputHint: 'Provide summary of all changes made to this submission',
            unlockSubmitModalInputValidation:
                'You must provide a summary of changes',
            errorHeading: ERROR_MESSAGES.resubmit_error_heading,
        },
        UNLOCK_PACKAGE: {
            modalHeading: 'Reason for unlocking submission',
            onSubmitText: 'Unlock',
            inputHint: 'Provide reason for unlocking',
            unlockSubmitModalInputValidation:
                'You must provide a reason for unlocking this submission',
            errorHeading: ERROR_MESSAGES.unlock_error_heading,
        },
        SUBMIT_PACKAGE: {
            modalHeading: 'Ready to submit?',
            onSubmitText: 'Submit',
            modalDescription:
                'Submitting this package will send it to CMS to begin their review.',
            errorHeading: ERROR_MESSAGES.submit_error_heading,
            errorSuggestion: ERROR_MESSAGES.submit_error_suggestion,
        },
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
        UNLOCK_RATE: {
            modalHeading: 'Reason for unlocking rate',
            onSubmitText: 'Unlock',
            inputHint: 'Provide reason for unlocking',
            unlockSubmitModalInputValidation:
                'You must provide a reason for unlocking this rate',
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
    }

export const UnlockSubmitModalV2 = ({
    submissionData,
    submissionName,
    modalType,
    modalRef,
    setIsSubmitting,
}: UnlockSubmitModalProps): React.ReactElement | null => {
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const [modalAlert, setModalAlert] = useState<
        GenericApiErrorProps | undefined
    >(undefined) // when api errors error
    const navigate = useNavigate()
    const { loggedInUser } = useAuth()

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
        modalType === 'UNLOCK_PACKAGE'
            ? unlockMutationLoading
            : submitMutationLoading
    const isSubmitting = mutationLoading || formik.isSubmitting
    const includesFormInput =
        modalType === 'UNLOCK_PACKAGE' ||
        modalType === 'RESUBMIT_PACKAGE' ||
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
            case 'UNLOCK_PACKAGE':
                if (unlockSubmitModalInput) {
                    await unlockMutationWrapper(
                        unlockHealthPlanPackage,
                        submissionData.id,
                        unlockSubmitModalInput
                    )
                }
                break

            case 'SUBMIT_PACKAGE' || 'RESUBMIT_PACKAGE':
                result = await submitMutationWrapper(
                    submitHealthPlanPackage,
                    submissionData.id,
                    unlockSubmitModalInput
                )
                break

            case 'UNLOCK_RATE':
                console.info('unlock rate not implemented yet')
                break

            case 'SUBMIT_RATE' || 'RESUBMIT_RATE':
                console.info('submit/resubmit rate not implemented yet')
                break
        }

        //Allow submitting/unlocking to continue on EMAIL_ERROR.
        if (result instanceof Error && result.cause === 'EMAIL_ERROR') {
            modalRef.current?.toggleModal(undefined, false)

            // We cannot update cache and re-fetch query inside the mutation because it returns an apollo
            // error on failing emails. We have to manually update cache depending on unlock or submit
            if (
                (modalType === 'SUBMIT_PACKAGE' ||
                    modalType === 'RESUBMIT_PACKAGE') &&
                submissionName
            ) {
                // Updating the package status here so when redirected to the dashboard the status will be up-to-date
                // without having to wait for the refetch.
                client.cache.updateQuery(
                    {
                        query: FetchHealthPlanPackageDocument,
                        variables: {
                            input: {
                                pkgID: submissionData.id,
                            },
                        },
                    },
                    (data) => {
                        const pkg = data?.fetchHealthPlanPackage?.pkg

                        if (pkg) {
                            return {
                                fetchHealthPlanPackage: {
                                    __typename: 'FetchHealthPlanPackagePayload',
                                    pkg: {
                                        ...pkg,
                                        status: 'SUBMITTED',
                                    },
                                },
                            }
                        }
                    }
                )
                navigate(
                    `/dashboard/submissions?justSubmitted=${submissionName}`
                )
            } else if (modalType === 'UNLOCK_PACKAGE') {
                // Updating the cache here with unlockInfo before manually re-fetching query.
                // This will prevent the loading animation to happen and have up-to-date unlock banner.
                const pkg = submissionData as HealthPlanPackage
                client.cache.writeQuery({
                    query: FetchHealthPlanPackageWithQuestionsDocument,
                    data: {
                        fetchHealthPlanPackage: {
                            pkg: {
                                ...pkg,
                                status: 'UNLOCKED',
                                revisions: [
                                    {
                                        __typename: 'HealthPlanRevisionEdge',
                                        node: {
                                            ...pkg.revisions[
                                                pkg.revisions.length - 1
                                            ].node,
                                            unlockInfo: {
                                                updatedAt: new Date(),
                                                updatedBy: loggedInUser?.email,
                                                updatedReason:
                                                    unlockSubmitModalInput,
                                            },
                                            submitInfo: null,
                                            id: null,
                                        },
                                    },
                                    ...pkg.revisions,
                                ],
                            },
                        },
                    },
                })
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
                (modalType === 'SUBMIT_PACKAGE' ||
                    modalType === 'RESUBMIT_PACKAGE') &&
                submissionName
            ) {
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
