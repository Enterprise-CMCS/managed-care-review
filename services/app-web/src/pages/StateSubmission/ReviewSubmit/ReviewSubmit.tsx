import {
    Alert, Button, CharacterCount, FormGroup,
    GridContainer, ModalRef, ModalToggleButton
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
    SupportingDocumentsSummarySection
} from '../../../components/SubmissionSummarySection'
import { useAuth } from '../../../contexts/AuthContext'
import {
    DraftSubmission,
    useSubmitDraftSubmissionMutation
} from '../../../gen/gqlClient'
import { PageActionsContainer } from '../PageActions'
import { Modal } from '../../../components/Modal'
import styles from './ReviewSubmit.module.scss'
import { PoliteErrorMessage } from '../../../components';
import { useFormik } from 'formik';
import * as Yup from 'yup';


export const ReviewSubmit = ({
    draftSubmission,
    unlocked
}: {
    draftSubmission: DraftSubmission,
    unlocked: boolean
}): React.ReactElement => {
    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const history = useHistory()
    const modalRef = useRef<ModalRef>(null)
    const { loggedInUser } = useAuth()

    // pull the programs off the user
    const statePrograms = (loggedInUser && ('state' in loggedInUser) && loggedInUser.state.programs) || []

    const [submitDraftSubmission] = useSubmitDraftSubmissionMutation({
        // An alternative to messing with the cache like we do with create, just zero it out.
        update(cache, { data }) {
            if (data) {
                cache.modify({
                    id: 'ROOT_QUERY',
                    fields: {
                        indexSubmissions2(_index, { DELETE }) {
                            return DELETE
                        },
                    },
                })
            }
        },
    })

    const showError = (error: string) => {
        setUserVisibleError(error)
    }

    const modalFormInitialValues = {
        submittedReason: '',
    }

    const formik = useFormik({
        initialValues: modalFormInitialValues,
        validationSchema: Yup.object().shape(
            {
                submittedReason: Yup.string()
                    .max(300, 'Summary for submission is too long')
                    .defined('Summary for submission is required')
            }
        ),
        onSubmit: (values) => onModalSubmit(values),
    })

    const submitHandler = async() => {
        setFocusErrorsInModal(true)
        if (unlocked) {
            formik.handleSubmit()
        } else {
            await onSubmit(undefined)
        }
    }

    const onModalSubmit = async (values: typeof modalFormInitialValues) => {
        const { submittedReason } = values
        modalRef.current?.toggleModal(undefined, false)
        await onSubmit(submittedReason)
    }

    const onSubmit = async (submittedReason: string | undefined): Promise<void> => {
        const input = { submissionID: draftSubmission.id }

        if (unlocked) {
            Object.assign(input, {
                submittedReason: submittedReason
            })
        }

        try {
            const data = await submitDraftSubmission({
                variables: {
                    input: input
                }
            })

            if (data.errors) {
                showError('Error attempting to submit. Please try again.')
                modalRef.current?.toggleModal(undefined, false)
            }

            if (data.data?.submitDraftSubmission) {
                history.push(`/dashboard?justSubmitted=${draftSubmission.name}`)
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
        if (
            focusErrorsInModal &&
            formik.errors.submittedReason
        ) {
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
                navigateTo="type"
                statePrograms={statePrograms}
            />

            <ContractDetailsSummarySection
                submission={draftSubmission}
                navigateTo="contract-details"
            />

            {isContractActionAndRateCertification && (
                <RateDetailsSummarySection
                    submission={draftSubmission}
                    navigateTo="rate-details"
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
                    <Button
                        type="button"
                        onClick={() => history.push('/dashboard')}
                        unstyled
                    >
                        Save as draft
                    </Button>
                }
            >
                <Button
                    type="button"
                    outline
                    onClick={() => history.push('documents')}
                >
                    Back
                </Button>
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
                modalHeading={unlocked ? 'Summarize changes' : 'Ready to submit?'}
                submitButtonProps={{ className: styles.submitButton }}
                onSubmitText={unlocked ? 'Resubmit' : undefined}
                onSubmit={submitHandler}
            >
                {unlocked ? (
                    <form>
                        <p>
                            Once you submit, this package will be sent to CMS for review and you will no longer be
                            able to make changes.
                        </p>
                        <FormGroup error={Boolean(formik.errors.submittedReason)}>
                            {formik.errors.submittedReason && (
                                <PoliteErrorMessage
                                    role="alert"
                                >
                                    {formik.errors.submittedReason}
                                </PoliteErrorMessage>
                            )}
                            <span
                                id="submittedReason-hint"
                                role="note"
                            >
                                Provide summary of all changes made to this submission
                            </span>
                            <CharacterCount
                                id="submittedReasonCharacterCount"
                                name="submittedReason"
                                maxLength={300}
                                isTextArea
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
                    )
                }
            </Modal>
        </GridContainer>
    )
}
