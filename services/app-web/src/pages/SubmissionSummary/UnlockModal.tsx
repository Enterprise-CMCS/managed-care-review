import React, { useState, useEffect } from 'react'
import { GraphQLErrors } from '@apollo/client/errors'
import { Alert, ModalRef, FormGroup, Textarea } from '@trussworks/react-uswds'
import * as Yup from 'yup'
import { useFormik } from 'formik'

import styles from './SubmissionSummary.module.scss'

import {
    HealthPlanPackage,
    UnlockHealthPlanPackageMutationFn,
    useUnlockHealthPlanPackageMutation,
} from '../../gen/gqlClient'
import { Modal, PoliteErrorMessage } from '../../components'
import { isGraphQLErrors } from '../../gqlHelpers'

type UnlockModalProps = {
    modalRef: React.RefObject<ModalRef> // needs to be established in the parent component
    healthPlanPackage: HealthPlanPackage
}

// This wrapper gets us some reasonable errors out of our unlock call. This would be a good candidate
// for a more general and generic function so that we can get more sensible errors out of all of the
// generated mutations.
async function unlockMutationWrapper(
    unlockHealthPlanPackage: UnlockHealthPlanPackageMutationFn,
    id: string,
    unlockedReason: string
): Promise<HealthPlanPackage | GraphQLErrors | Error> {
    try {
        const result = await unlockHealthPlanPackage({
            variables: {
                input: {
                    pkgID: id,
                    unlockedReason,
                },
            },
        })

        if (result.errors) {
            return result.errors
        }

        if (result.data?.unlockHealthPlanPackage.pkg) {
            return result.data?.unlockHealthPlanPackage.pkg
        } else {
            return new Error('No errors, and no unlock result.')
        }
    } catch (error) {
        // this can be an errors object
        if ('graphQLErrors' in error) {
            return error.graphQLErrors
        }
        return error
    }
}

export const UnlockModal = ({
    modalRef,
    healthPlanPackage,
}: UnlockModalProps): React.ReactElement | null => {
    const [modalAlert, setModalAlert] = useState<string | null>(null) // when api errors error
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true) // when formik errors occur
    const modalFormInitialValues = {
        unlockReason: '',
    }

    const [unlockHealthPlanPackage] = useUnlockHealthPlanPackageMutation()
    const formik = useFormik({
        initialValues: modalFormInitialValues,
        validationSchema: Yup.object().shape({
            unlockReason: Yup.string().defined(
                'Reason for unlocking submission is required'
            ),
        }),
        onSubmit: (values) => onModalSubmit(values),
    })

    // Focus unlockReason field in the unlock modal on submit click when errors exist
    useEffect(() => {
        if (focusErrorsInModal && formik.errors.unlockReason) {
            const fieldElement: HTMLElement | null = document.querySelector(
                `[name="unlockReason"]`
            )

            if (fieldElement) {
                fieldElement.focus()
                setFocusErrorsInModal(false)
            } else {
                console.log('Attempting to focus element that does not exist')
            }
        }
    }, [focusErrorsInModal, formik.errors])

    const onModalSubmit = async (values: typeof modalFormInitialValues) => {
        const { unlockReason } = values
        await onUnlock(unlockReason)
    }

    const onUnlock = async (unlockReason: string) => {
        const result = await unlockMutationWrapper(
            unlockHealthPlanPackage,
            healthPlanPackage.id,
            unlockReason
        )

        if (result instanceof Error) {
            console.error(
                'ERROR: got an Apollo Client Error attempting to unlock',
                result
            )
            setModalAlert('Error attempting to unlock. Please try again.')
            modalRef.current?.toggleModal(undefined, false)
        } else if (isGraphQLErrors(result)) {
            console.error('ERROR: got a GraphQL error response', result)
            if (result[0].extensions.code === 'BAD_USER_INPUT') {
                setModalAlert(
                    'Submission is already unlocked. Please refresh and try again.'
                )
            } else {
                setModalAlert('Error attempting to unlock. Please try again.')
            }
            modalRef.current?.toggleModal(undefined, false)
        } else {
            const unlockedSub: HealthPlanPackage = result
            modalRef.current?.toggleModal(undefined, false)
            console.log('Submission Unlocked', unlockedSub)
        }
    }

    return (
        <Modal
            modalHeading="Reason for unlocking submission"
            id="unlockReason"
            onSubmit={() => {
                setFocusErrorsInModal(true)
                formik.handleSubmit()
            }}
            isSubmitting={formik.isSubmitting}
            modalRef={modalRef}
            onSubmitText="Unlock"
        >
            <form>
                {modalAlert && (
                    <Alert type="error" heading="Unlock Error">
                        {modalAlert}
                    </Alert>
                )}
                <FormGroup error={Boolean(formik.errors.unlockReason)}>
                    {formik.errors.unlockReason && (
                        <PoliteErrorMessage role="alert">
                            {formik.errors.unlockReason}
                        </PoliteErrorMessage>
                    )}
                    <span id="unlockReason-hint" role="note">
                        Provide reason for unlocking
                    </span>
                    <Textarea
                        id="unlockReasonCharacterCount"
                        name="unlockReason"
                        data-testid="unlockReason"
                        aria-labelledby="unlockReason-hint"
                        className={styles.unlockReasonTextarea}
                        aria-required
                        error={!!formik.errors.unlockReason}
                        onChange={formik.handleChange}
                        defaultValue={formik.values.unlockReason}
                    />
                </FormGroup>
            </form>
        </Modal>
    )
}
