import React, { useState, useRef } from 'react'
import {
    Button,
    ButtonGroup,
    GridContainer,
    Link,
    Alert,
    Modal,
    ModalToggleButton,
    ModalHeading,
    ModalFooter,
    ModalRef,
} from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import styles from './ReviewSubmit.module.scss'
import stylesForm from '../StateSubmissionForm.module.scss'

import {
    SubmissionTypeSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    ContactsSummarySection,
    DocumentsSummarySection,
} from '../../../components/SubmissionSummarySection'
import {
    DraftSubmission,
    useSubmitDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import { MCRouterState } from '../../../constants/routerState'

export const ReviewSubmit = ({
    draftSubmission,
}: {
    draftSubmission: DraftSubmission
}): React.ReactElement => {
    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const history = useHistory<MCRouterState>()
    const modalRef = useRef<ModalRef>(null)


    const [submitDraftSubmission] = useSubmitDraftSubmissionMutation({
        // An alternative to messing with the cache like we do with create, just zero it out.
        update(cache, { data }) {
            if (data) {
                cache.modify({
                    id: 'ROOT_QUERY',
                    fields: {
                        indexSubmissions(_index, { DELETE }) {
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

    const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()

        try {
            const data = await submitDraftSubmission({
                variables: {
                    input: {
                        submissionID: draftSubmission.id,
                    },
                },
            })


            if (data.errors) {
                showError('Error attempting to submit. Please try again.')
                modalRef.current?.toggleModal(undefined, false)
            }

            if (data.data?.submitDraftSubmission) {
                history.push(`/dashboard?justSubmitted=${draftSubmission.name}`)
            }
        } catch (error) {
            showError('Error attempting to submit. Please try again.')
            modalRef.current?.toggleModal(undefined, false)
        }
        
    }

    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'


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

            <DocumentsSummarySection
                submission={draftSubmission}
                navigateTo="documents"
            />

            <div className={stylesForm.pageActions}>
                <Link
                    asCustom={NavLink}
                    className="usa-button usa-button--unstyled"
                    variant="unstyled"
                    to={{
                        pathname: '/dashboard',
                        state: { defaultProgramID: draftSubmission.programID },
                    }}
                >
                    Save as draft
                </Link>
                <ButtonGroup type="default" className={stylesForm.buttonGroup}>
                    <Link
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        variant="unstyled"
                        to="documents"
                    >
                        Back
                    </Link>
                    <ModalToggleButton
                        modalRef={modalRef}
                        className={styles.submitButton}
                        opener
                    >
                        Submit
                    </ModalToggleButton>
                </ButtonGroup>

                <Modal
                    ref={modalRef}
                    aria-labelledby="review-and-submit-modal-heading"
                    aria-describedby="review-and-submit-modal-description"
                    id="review-and-submit-modal"
                >
                    <ModalHeading id="review-and-submit-modal-heading">
                        Ready to submit?
                    </ModalHeading>
                    <p id="review-and-submit-description">
                        Submitting this package will send it to CMS to begin
                        their review.
                    </p>
                    <ModalFooter>
                        <ButtonGroup className="float-right">
                            <ModalToggleButton
                                modalRef={modalRef}
                                closer
                                outline
                            >
                                Cancel
                            </ModalToggleButton>
                            <Button
                                type="button"
                                key="submitButton"
                                aria-label="Confirm submit"
                                className={styles.submitButton}
                                onClick={handleFormSubmit}
                            >
                                Confirm submit
                            </Button>
                        </ButtonGroup>
                    </ModalFooter>
                </Modal>
            </div>
        </GridContainer>
    )
}
