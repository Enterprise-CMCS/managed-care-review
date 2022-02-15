import { Alert, Button, ButtonGroup, GridContainer, Link, Modal, ModalFooter, ModalHeading, ModalRef, ModalToggleButton, Textarea } from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import { Loading } from '../../components/Loading'
import {
    ContactsSummarySection, ContractDetailsSummarySection,
    RateDetailsSummarySection, SubmissionTypeSummarySection, SupportingDocumentsSummarySection
} from '../../components/SubmissionSummarySection'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { useFetchStateSubmissionQuery, useUnlockStateSubmissionMutation } from '../../gen/gqlClient'
import { GenericError } from '../Errors/GenericError'
import styles from './SubmissionSummary.module.scss'

function unlockModalButton(modalRef: React.RefObject<ModalRef>) {
    return (
        <ModalToggleButton
            modalRef={modalRef}
            data-testid="form-submit"
            outline
            opener
        >
            Unlock submission
        </ModalToggleButton>
        )
}

export const SubmissionSummary = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const [userVisibleUnlockError, setUserVisibleUnlockError] = useState<
        string | undefined
    >(undefined)
    const modalRef = useRef<ModalRef>(null)

    const { loading, error, data } = useFetchStateSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const [unlockStateSubmission] = useUnlockStateSubmissionMutation()

    console.log("FETCH", id, loading, error, data)

    const submission = data?.fetchStateSubmission.submission

    useEffect(() => {
        updateHeading(pathname, submission?.name)
    }, [updateHeading, pathname, submission?.name])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error || !submission) return <GenericError />

    const onUnlock = async () => {
        try {
            const result = await unlockStateSubmission({
                variables: {
                    input: {
                        submissionID: submission.id
                    }
                }
            })

            if (result.errors) {
                console.error('ERROR: got an error attempting to unlock', result.errors)
                setUserVisibleUnlockError('Error attempting to unlock. Please try again.')
                modalRef.current?.toggleModal(undefined, false)
            }

            if (result.data?.unlockStateSubmission.draftSubmission) {
                console.log('Submission Unlocked')
                modalRef.current?.toggleModal(undefined, false)
            } else {
                console.error('ERROR: Got nothing back from unlock')
                modalRef.current?.toggleModal(undefined, false)
                setUserVisibleUnlockError('Error attempting to unlock. Please try again.')
            }
            
        } catch (error) {
            console.error('ERROR: got an error attempting to unlock', error)
            setUserVisibleUnlockError('Error attempting to unlock. Please try again.')
            modalRef.current?.toggleModal(undefined, false)
        }

    }

    const isContractActionAndRateCertification =
        submission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {userVisibleUnlockError && (
                    <Alert type="error" heading="Unlock Error">
                        {userVisibleUnlockError}
                    </Alert>
                )}

                {loggedInUser?.__typename === 'StateUser' ? (
                    <Link
                        asCustom={NavLink}
                        variant="unstyled"
                        to={{
                            pathname: '/dashboard',
                        }}
                    >
                        <svg
                            className="usa-icon"
                            aria-hidden="true"
                            focusable="false"
                            role="img"
                        >
                            <use xlinkHref={`${sprite}#arrow_back`}></use>
                        </svg>
                        <span>&nbsp;Back to state dashboard</span>
                    </Link>
                ) : null}

                <SubmissionTypeSummarySection submission={submission} unlockModalButton={unlockModalButton(modalRef)} />

                <ContractDetailsSummarySection submission={submission} />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection submission={submission} />
                )}

                <ContactsSummarySection submission={submission} />

                <SupportingDocumentsSummarySection submission={submission} />

                <Modal
                    ref={modalRef}
                    aria-labelledby="review-and-submit-modal-heading"
                    aria-describedby="review-and-submit-modal-description"
                    id="review-and-submit-modal"
                >
                    <ModalHeading id="review-and-submit-modal-heading">
                        Reason for unlocking submission
                    </ModalHeading>
                    <Textarea
                        id={'unlockReason'}
                        name={'unlockReason'}
                    />
                    <ModalFooter>
                        <ButtonGroup className="float-right">
                            <ModalToggleButton modalRef={modalRef} closer outline>
                                Cancel
                            </ModalToggleButton>
                            <Button
                                type="button"
                                key="submitButton"
                                aria-label="Submit"
                                data-testid="modal-submit"
                                onClick={onUnlock}
                            >
                                Unlock
                            </Button>
                        </ButtonGroup>
                    </ModalFooter>
                </Modal>

            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
