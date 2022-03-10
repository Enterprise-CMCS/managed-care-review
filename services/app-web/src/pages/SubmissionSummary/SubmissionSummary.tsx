import { GraphQLErrors } from '@apollo/client/errors'
import {
    Alert,
    Button,
    GridContainer,
    Link,
    Textarea,
} from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useParams} from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import {submissionName, SubmissionUnionType, UpdateInfoType } from '../../common-code/domain-models'
import { base64ToDomain } from '../../common-code/proto/stateSubmission'
import { Loading } from '../../components/Loading'
import {
    ContactsSummarySection, ContractDetailsSummarySection,
    RateDetailsSummarySection, SubmissionTypeSummarySection, SupportingDocumentsSummarySection
} from '../../components/SubmissionSummarySection'
import { SubmissionUnlockedBanner, PoliteErrorMessage, ReviewAndSubmitModal } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import {
    DraftSubmission,
    StateSubmission,
    Submission2,
    UnlockStateSubmissionMutationFn,
    useFetchSubmission2Query,
    useUnlockStateSubmissionMutation } from '../../gen/gqlClient'
import { isGraphQLErrors } from '../../gqlHelpers'
import { GenericError } from '../Errors/GenericError'
import { Error404 } from '../Errors/Error404'

import styles from './SubmissionSummary.module.scss'

function unlockModalButton(onClick: () => void, disabled: boolean) {
    return (
        <Button
            data-testid="form-submit"
            type="button"
            outline
            onClick={onClick}
            disabled={disabled}
        >
            Unlock submission
        </Button>
    )
}

// This wrapper gets us some reasonable errors out of our unlock call. This would be a good candidate
// for a more general and generic function so that we can get more sensible errors out of all of the 
// generated mutations.
async function unlockMutationWrapper(unlockStateSubmission: UnlockStateSubmissionMutationFn, id: string, unlockedReason: string): Promise<Submission2 | GraphQLErrors | Error> {
    try {
        const result = await unlockStateSubmission({
            variables: {
                input: {
                    submissionID: id,
                    unlockedReason
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
    const [pageLevelAlert, setPageLevelAlert] = useState<
        string | undefined
    >(undefined)
    const [showError, setShowError] = useState(false)
    const [unlockReason, setUnlockReason] = useState('')
    const [packageData, setPackageData] = useState<SubmissionUnionType | undefined>(undefined)
    const [unlockedInfo, setUnlockedInfo] = useState<UpdateInfoType | null | undefined>(undefined)
    const [showModal, setShowModal] = useState(false)

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
                setPageLevelAlert('Error fetching the submission. Please try again.')
                return
            }

            const submissionResult = base64ToDomain(currentRevision.revision.submissionData)
            if (submissionResult instanceof Error) {
                console.error('ERROR: got a proto decoding error', submissionResult)
                setPageLevelAlert('Error fetching the submission. Please try again.')
                return
            }

            if (submissionAndRevisions.status === 'UNLOCKED') {
                const unlockedRevision = submissionAndRevisions.revisions.find(rev => rev.revision.unlockInfo)
                const unlockInfo = unlockedRevision?.revision.unlockInfo

                if (unlockInfo?.updatedBy && unlockInfo?.updatedAt && unlockInfo?.updatedReason) {
                    //For some reason the type for unlockInfo from graphql is <UnlockedInfo | null | undefined>, not sure where the null came from
                    setUnlockedInfo({
                        updatedBy: unlockInfo.updatedBy,
                        updatedAt: unlockInfo.updatedAt,
                        updatedReason: unlockInfo.updatedReason
                    })
                } else {
                    //Maybe could use a better error message.
                    console.error('ERROR: submission in summary has no revision with unlocked information', submissionAndRevisions.revisions)
                    setPageLevelAlert('Error fetching the unlocked information. Please try again.')
                }
            }

            setPackageData(submissionResult)
        }
    }, [submissionAndRevisions, setPackageData, setPageLevelAlert])

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

    if (data && (!submissionAndRevisions)) return <Error404 /> // api request resolves but are no revisions likely because invalid submission is queried. This should be "Not Found"
    if (error || !packageData || !submissionAndRevisions) return <GenericError /> // api failure or protobuf decode failure

    const resetModal = () => {
        setShowError(false)
        setUnlockReason('')
        setShowModal(false)
    }

    const onUnlock = async () => {
        if (!unlockReason) {
            setShowError(true)
            return
        }
        const result = await unlockMutationWrapper(unlockStateSubmission, submissionAndRevisions.id, unlockReason)

        if (result instanceof Error) {
            console.error('ERROR: got an Apollo Client Error attempting to unlock', result)
            setPageLevelAlert('Error attempting to unlock. Please try again.')
        } else if (isGraphQLErrors(result)) {
            console.error('ERROR: got a GraphQL error response', result)
            if (result[0].extensions.code === 'BAD_USER_INPUT') {
                setPageLevelAlert('Submission is already unlocked. Please refresh and try again.')
            } else {
                setPageLevelAlert('Error attempting to unlock. Please try again.')
            }
        } else {
            const unlockedSub: Submission2 = result
            console.log('Submission Unlocked', unlockedSub)
        }

        resetModal()
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

    const submissionUnlocked = submissionAndRevisions.status === 'UNLOCKED'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {pageLevelAlert && (
                    <Alert type="error" heading="Unlock Error">
                        {pageLevelAlert}
                    </Alert>
                )}

                {submissionUnlocked && unlockedInfo && (
                    <SubmissionUnlockedBanner
                        userType={loggedInUser?.role === 'CMS_USER' ? 'CMS_USER' : 'STATE_USER'}
                        unlockedBy={unlockedInfo.updatedBy}
                        unlockedOn={unlockedInfo.updatedAt}
                        reason={unlockedInfo.updatedReason}
                    />
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

                <SubmissionTypeSummarySection submission={submission} unlockModalButton={displayUnlockButton ? unlockModalButton(() => setShowModal(true), disableUnlockButton) : undefined} />

                <ContractDetailsSummarySection submission={submission} />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection submission={submission} />
                )}

                <ContactsSummarySection submission={submission} />

                <SupportingDocumentsSummarySection submission={submission} />

                <ReviewAndSubmitModal
                    modalTitle="Reason for unlocking submission"
                    onSubmit={onUnlock}
                    onCancel={resetModal}
                    showModal={showModal}
                >
                    {showError && (
                        <PoliteErrorMessage>Reason for unlocking submission is required</PoliteErrorMessage>
                    )}
                    <div role="note" aria-labelledby="unlockReason" className="usa-hint margin-top-1">
                        <p id="unlockReasonHelp">
                            Provide reason for unlocking
                        </p>
                    </div>
                    <Textarea
                        id="unlockReason"
                        name="unlockReason"
                        data-testid="unlockReason"
                        aria-describedby="unlockReasonHelp unlockReasonHelp2"
                        className={styles.unlockReasonTextarea}
                        aria-required
                        maxLength={300}
                        value={unlockReason}
                        error={showError}
                        onChange={e => setUnlockReason(e.target.value)}
                    />
                    <div role="note" className="usa-hint margin-top-1">
                        <p id="unlockReasonHelp2">
                            300 characters allowed
                        </p>
                    </div>
                </ReviewAndSubmitModal>
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
