import React, { useState } from 'react'
import {
    Button,
    ButtonGroup,
    GridContainer,
    Link,
    Alert,
} from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import styles from './ReviewSubmit.module.scss'
import stylesForm from '../StateSubmissionForm.module.scss'
import { Dialog } from '../../../components/Dialog'
import {
    SubmissionTypeSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    ContactsSummarySection,
    DocumentsSummarySection,
} from '../../SubmissionSummary'
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
    const [displayConfirmation, setDisplayConfirmation] =
        useState<boolean>(false)

    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const history = useHistory<MCRouterState>()
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

    const handleSubmitConfirmation = () => {
        console.log('Confirmation Button Presssed')
        setDisplayConfirmation(true)
    }

    const handleCancelSubmitConfirmation = () => {
        console.log('cancel sub comf')
        setDisplayConfirmation(false)
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

            console.log('Got data: ', data)

            if (data.errors) {
                console.log(data.errors)
                showError('Error attempting to submit. Please try again.')
                setDisplayConfirmation(false)
            }

            if (data.data?.submitDraftSubmission) {
                history.push(`/dashboard?justSubmitted=${draftSubmission.name}`)
            }
        } catch (error) {
            console.log(error)
            showError('Error attempting to submit. Please try again.')
            setDisplayConfirmation(false)
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
                    <Button
                        type="button"
                        className={styles.submitButton}
                        data-testid="pageSubmitButton"
                        onClick={handleSubmitConfirmation}
                    >
                        Submit
                    </Button>
                </ButtonGroup>

                {displayConfirmation && (
                    <Dialog
                        heading="Ready to submit?"
                        actions={[
                            <Button
                                type="button"
                                key="cancelButton"
                                outline
                                onClick={handleCancelSubmitConfirmation}
                            >
                                Cancel
                            </Button>,
                            <Button
                                type="button"
                                key="submitButton"
                                aria-label="Confirm submit"
                                className={styles.submitButton}
                                onClick={handleFormSubmit}
                            >
                                Submit
                            </Button>,
                        ]}
                    >
                        <p>
                            Submitting this package will send it to CMS to begin
                            their review.
                        </p>
                    </Dialog>
                )}
            </div>
        </GridContainer>
    )
}
