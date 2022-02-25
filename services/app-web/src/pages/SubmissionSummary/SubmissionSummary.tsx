import { GraphQLErrors } from '@apollo/client/errors'
import { Alert, Button, ButtonGroup, GridContainer, Link, Modal, ModalFooter, ModalHeading, ModalRef, ModalToggleButton, Textarea } from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import { submissionName, SubmissionUnionType } from '../../common-code/domain-models'
import { base64ToDomain } from '../../common-code/proto/stateSubmission'
import { Loading } from '../../components/Loading'
import {
    ContactsSummarySection, ContractDetailsSummarySection,
    RateDetailsSummarySection, SubmissionTypeSummarySection, SupportingDocumentsSummarySection
} from '../../components/SubmissionSummarySection'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { DraftSubmission, StateSubmission, Submission2, UnlockStateSubmissionMutationFn, useFetchSubmission2Query, useUnlockStateSubmissionMutation } from '../../gen/gqlClient'
import { isGraphQLErrors } from '../../gqlHelpers'
import { GenericError } from '../Errors/GenericError'
import styles from './SubmissionSummary.module.scss'

function unlockModalButton(modalRef: React.RefObject<ModalRef>, disabled: boolean) {
    return (
        <ModalToggleButton
            modalRef={modalRef}
            data-testid="form-submit"
            outline
            opener
            disabled={disabled}
        >
            Unlock submission
        </ModalToggleButton>
    )
}

// This wrapper gets us some reasonable errors out of our unlock call. This would be a good candidate
// for a more general and generic function so that we can get more sensible errors out of all of the 
// generated mutations.
async function unlockMutationWrapper(unlockStateSubmission: UnlockStateSubmissionMutationFn, id: string): Promise<Submission2 | GraphQLErrors | Error> {
    try {
        const result = await unlockStateSubmission({
            variables: {
                input: {
                    submissionID: id
                }
            }
        })

        if (result.errors) {
            return result.errors
        }

        if (result.data?.unlockStateSubmission.submission) {
            return result.data?.unlockStateSubmission.submission
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


export const SubmissionSummary = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const [userVisibleUnlockError, setUserVisibleUnlockError] = useState<
        string | undefined
    >(undefined)
    const modalRef = useRef<ModalRef>(null)
    const [packageData, setPackageData] = useState<SubmissionUnionType | undefined>(undefined)

    const { loading, error, data } = useFetchSubmission2Query({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const [unlockStateSubmission] = useUnlockStateSubmissionMutation()

    const submissionAndRevisions = data?.fetchSubmission2.submission

    // This is a hacky way to fake feature flags before we have feature flags.
    // please avoid reading env vars outside of index.tsx in general. 
    const environmentName = process.env.REACT_APP_STAGE_NAME || ''
    const isProdEnvironment = ['prod', 'val'].includes(environmentName)

    const displayUnlockButton = !isProdEnvironment && loggedInUser?.role === 'CMS_USER'

    // pull out the correct revision
    useEffect(() => {
        if (submissionAndRevisions) {
            // We ignore revisions currently being edited. 
            // The summary page should only ever called on a package that has been submitted once
            const currentRevision = submissionAndRevisions.revisions.find(rev => {
                // we want the most recent revision that has submission info.
                return (rev.revision.submitInfo)
            })
            if (!currentRevision) {
                console.error('ERROR: submission in summary has no submitted revision', submissionAndRevisions.revisions)
                setUserVisibleUnlockError('Error fetching the submission. Please try again.')
                return
            }

            const submissionResult = base64ToDomain(currentRevision.revision.submissionData)
            if (submissionResult instanceof Error) {
                console.error('ERROR: got a proto decoding error', submissionResult)
                setUserVisibleUnlockError('Error fetching the submission. Please try again.')
                return
            }
            setPackageData(submissionResult)
        }
    }, [submissionAndRevisions, setPackageData, setUserVisibleUnlockError])

    useEffect(() => {
        if (packageData) {
            updateHeading(pathname, submissionName(packageData))
        }
    }, [updateHeading, pathname, packageData])

    if (loading || !submissionAndRevisions || !packageData) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error) return <GenericError />

    const onUnlock = async () => {
        const result = await unlockMutationWrapper(unlockStateSubmission, submissionAndRevisions.id)

        if (result instanceof Error) {
            console.error('ERROR: got an Apollo Client Error attempting to unlock', result)
            setUserVisibleUnlockError('Error attempting to unlock. Please try again.')
        } else if (isGraphQLErrors(result)) {
            console.error('ERROR: got a GraphQL error response', result)
            if (result[0].extensions.code === 'BAD_USER_INPUT') {
                setUserVisibleUnlockError('Submission is already unlocked. Please refresh and try again.')
            } else {
                setUserVisibleUnlockError('Error attempting to unlock. Please try again.')
            }
        } else {
            const unlockedSub: Submission2 = result
            console.log('Submission Unlocked', unlockedSub)
        }

        modalRef.current?.toggleModal(undefined, false)
    }

    // temporary kludge while the display data is expecting the wrong format. 
    // This is turning our domain model into the GraphQL model which is what
    // all our frontend stuff expects right now. 
    const submission: StateSubmission | DraftSubmission = packageData.status === 'DRAFT' ? {
        ...packageData,
        __typename: 'DraftSubmission' as const,
        name: submissionName(packageData),
        program: {
            id: 'bogs-id',
            name: 'bogus-program'
        },
    } : {
        ...packageData,
        __typename: 'StateSubmission' as const,
        name: submissionName(packageData),
        program: {
            id: 'bogs-id',
            name: 'bogus-program'
        },
        submittedAt: submissionAndRevisions.intiallySubmittedAt
    }

    const disableUnlockButton = ['DRAFT', 'UNLOCKED'].includes(submissionAndRevisions.status)

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

                <SubmissionTypeSummarySection submission={submission} unlockModalButton={displayUnlockButton ? unlockModalButton(modalRef, disableUnlockButton) : undefined} />

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
                                Submit
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
