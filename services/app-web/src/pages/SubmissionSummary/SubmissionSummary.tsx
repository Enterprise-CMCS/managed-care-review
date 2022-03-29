import { GraphQLErrors } from '@apollo/client/errors'
import {
    Alert,
    GridContainer,
    Link,
    CharacterCount,
    ModalRef,
    ModalToggleButton,
    FormGroup,
} from '@trussworks/react-uswds'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import React, { useEffect, useState, useRef } from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import {
    submissionName,
    SubmissionUnionType,
    UpdateInfoType,
} from '../../common-code/domain-models'
import { base64ToDomain } from '../../common-code/proto/stateSubmission'
import { Loading } from '../../components/Loading'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
    SupportingDocumentsSummarySection,
} from '../../components/SubmissionSummarySection'
import {
    SubmissionUnlockedBanner,
    Modal,
    PoliteErrorMessage,
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import {
    DraftSubmission,
    StateSubmission,
    Submission2,
    UnlockStateSubmissionMutationFn,
    useFetchSubmission2Query,
    useUnlockStateSubmissionMutation,
} from '../../gen/gqlClient'
import { isGraphQLErrors } from '../../gqlHelpers'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404'

import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory/ChangeHistory'

export type DocumentDateLookupTable = {
    [key: string]: string
}

function UnlockModalButton({
    disabled,
    modalRef,
}: {
    disabled: boolean
    modalRef: React.RefObject<ModalRef>
}) {
    return (
        <ModalToggleButton
            modalRef={modalRef}
            className={styles.submitButton}
            data-testid="form-submit"
            disabled={disabled}
            outline
            opener
        >
            Unlock submission
        </ModalToggleButton>
    )
}

// This wrapper gets us some reasonable errors out of our unlock call. This would be a good candidate
// for a more general and generic function so that we can get more sensible errors out of all of the
// generated mutations.
async function unlockMutationWrapper(
    unlockStateSubmission: UnlockStateSubmissionMutationFn,
    id: string,
    unlockedReason: string
): Promise<Submission2 | GraphQLErrors | Error> {
    try {
        const result = await unlockStateSubmission({
            variables: {
                input: {
                    submissionID: id,
                    unlockedReason,
                },
            },
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
    // Page level state
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const [pageLevelAlert, setPageLevelAlert] = useState<string | undefined>(
        undefined
    )

    // Api fetched data state
    const [packageData, setPackageData] = useState<
        SubmissionUnionType | undefined
    >(undefined)
    const [unlockedInfo, setUnlockedInfo] = useState<UpdateInfoType | null>(
        null
    )

    // Unlock modal state
    const [focusErrorsInModal, setFocusErrorsInModal] = useState(true)
    const modalRef = useRef<ModalRef>(null)
    const modalFormInitialValues = {
        unlockReason: '',
    }

    // document date lookup state
    const [documentDates, setDocumentDates] = useState<DocumentDateLookupTable>(
        {}
    )

    const makeDateTable = (submissions: Submission2) => {
        const docBuckets = [
            'contractDocuments',
            'rateDocuments',
            'documents',
        ] as const
        const lookupTable = {} as DocumentDateLookupTable
        if (submissions) {
            submissions.revisions.forEach((revision) => {
                const revisionData = base64ToDomain(
                    revision.revision.submissionData
                )
                if (revisionData instanceof Error) {
                    console.error(
                        'failed to read submission data; unable to display document dates'
                    )
                    return
                }
                docBuckets.forEach((bucket) => {
                    revisionData[bucket].forEach((doc) => {
                        lookupTable[doc.name] = revisionData.updatedAt
                    })
                })
            })
            console.log('LOOKUP TABLE: ', lookupTable)
            setDocumentDates(lookupTable)
        }
    }
    const formik = useFormik({
        initialValues: modalFormInitialValues,
        validationSchema: Yup.object().shape({
            unlockReason: Yup.string()
                .max(300, 'Reason for unlocking submission is too long')
                .defined('Reason for unlocking submission is required'),
        }),
        onSubmit: (values) => onModalSubmit(values),
    })

    const { loading, error, data } = useFetchSubmission2Query({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const [unlockStateSubmission] = useUnlockStateSubmissionMutation()
    const submissionAndRevisions = data?.fetchSubmission2.submission

    const displayUnlockButton = loggedInUser?.role === 'CMS_USER'

    // Pull out the correct revision form api request, display errors for bad dad
    useEffect(() => {
        if (submissionAndRevisions) {
            makeDateTable(submissionAndRevisions)
            // We ignore revisions currently being edited.
            // The summary page should only ever called on a package that has been submitted once
            const currentRevision = submissionAndRevisions.revisions.find(
                (rev) => {
                    // we want the most recent revision that has submission info.
                    return rev.revision.submitInfo
                }
            )

            if (!currentRevision) {
                console.error(
                    'ERROR: submission in summary has no submitted revision',
                    submissionAndRevisions.revisions
                )
                setPageLevelAlert(
                    'Error fetching the submission. Please try again.'
                )
                return
            }

            const submissionResult = base64ToDomain(
                currentRevision.revision.submissionData
            )
            if (submissionResult instanceof Error) {
                console.error(
                    'ERROR: got a proto decoding error',
                    submissionResult
                )
                setPageLevelAlert(
                    'Error fetching the submission. Please try again.'
                )
                return
            }

            if (submissionAndRevisions.status === 'UNLOCKED') {
                const unlockedRevision = submissionAndRevisions.revisions.find(
                    (rev) => rev.revision.unlockInfo
                )
                const unlockInfo = unlockedRevision?.revision.unlockInfo

                if (unlockInfo) {
                    setUnlockedInfo({
                        updatedBy: unlockInfo.updatedBy,
                        updatedAt: unlockInfo.updatedAt,
                        updatedReason: unlockInfo.updatedReason,
                    })
                } else {
                    console.error(
                        'ERROR: submission in summary has no revision with unlocked information',
                        submissionAndRevisions.revisions
                    )
                    setPageLevelAlert(
                        'Error fetching the unlocked information. Please try again.'
                    )
                }
            }

            setPackageData(submissionResult)
        }
    }, [submissionAndRevisions, setPackageData, setPageLevelAlert])

    // Update header with submission name
    useEffect(() => {
        if (packageData) {
            updateHeading(pathname, submissionName(packageData))
        }
    }, [updateHeading, pathname, packageData])

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

    if (loading || !submissionAndRevisions || !packageData) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (data && !submissionAndRevisions) return <Error404 /> // api request resolves but are no revisions likely because invalid submission is queried. This should be "Not Found"
    if (error || !packageData || !submissionAndRevisions)
        return <GenericErrorPage /> // api failure or protobuf decode failure

    const onModalSubmit = async (values: typeof modalFormInitialValues) => {
        const { unlockReason } = values
        modalRef.current?.toggleModal(undefined, false)
        await onUnlock(unlockReason)
    }

    const onUnlock = async (unlockReason: string) => {
        const result = await unlockMutationWrapper(
            unlockStateSubmission,
            submissionAndRevisions.id,
            unlockReason
        )

        if (result instanceof Error) {
            console.error(
                'ERROR: got an Apollo Client Error attempting to unlock',
                result
            )
            setPageLevelAlert('Error attempting to unlock. Please try again.')
        } else if (isGraphQLErrors(result)) {
            console.error('ERROR: got a GraphQL error response', result)
            if (result[0].extensions.code === 'BAD_USER_INPUT') {
                setPageLevelAlert(
                    'Submission is already unlocked. Please refresh and try again.'
                )
            } else {
                setPageLevelAlert(
                    'Error attempting to unlock. Please try again.'
                )
            }
        } else {
            const unlockedSub: Submission2 = result
            console.log('Submission Unlocked', unlockedSub)
        }
    }

    // temporary kludge while the display data is expecting the wrong format.
    // This is turning our domain model into the GraphQL model which is what
    // all our frontend stuff expects right now.
    const submission: StateSubmission | DraftSubmission =
        packageData.status === 'DRAFT'
            ? {
                  ...packageData,
                  __typename: 'DraftSubmission' as const,
                  name: submissionName(packageData),
                  program: {
                      id: 'bogs-id',
                      name: 'bogus-program',
                  },
              }
            : {
                  ...packageData,
                  __typename: 'StateSubmission' as const,
                  name: submissionName(packageData),
                  program: {
                      id: 'bogs-id',
                      name: 'bogus-program',
                  },
                  submittedAt: submissionAndRevisions.intiallySubmittedAt,
              }

    const disableUnlockButton = ['DRAFT', 'UNLOCKED'].includes(
        submissionAndRevisions.status
    )

    const isContractActionAndRateCertification =
        submission.submissionType === 'CONTRACT_AND_RATES'

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

                {unlockedInfo && (
                    <SubmissionUnlockedBanner
                        userType={
                            loggedInUser?.role === 'CMS_USER'
                                ? 'CMS_USER'
                                : 'STATE_USER'
                        }
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

                <SubmissionTypeSummarySection
                    submission={submission}
                    unlockModalButton={
                        displayUnlockButton ? (
                            <UnlockModalButton
                                modalRef={modalRef}
                                disabled={disableUnlockButton}
                            />
                        ) : undefined
                    }
                />
                <ContractDetailsSummarySection
                    submission={submission}
                    documentDateLookupTable={documentDates}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        submission={submission}
                        documentDateLookupTable={documentDates}
                    />
                )}

                <ContactsSummarySection submission={submission} />

                <SupportingDocumentsSummarySection submission={submission} />

                <ChangeHistory submission={submissionAndRevisions} />

                <Modal
                    modalHeading="Reason for unlocking submission"
                    id="unlockReason"
                    onSubmit={() => {
                        setFocusErrorsInModal(true)
                        formik.handleSubmit()
                    }}
                    modalRef={modalRef}
                >
                    <form>
                        <FormGroup error={Boolean(formik.errors.unlockReason)}>
                            {formik.errors.unlockReason && (
                                <PoliteErrorMessage role="alert">
                                    {formik.errors.unlockReason}
                                </PoliteErrorMessage>
                            )}
                            <span id="unlockReason-hint" role="note">
                                Provide reason for unlocking
                            </span>

                            <CharacterCount
                                id="unlockReasonCharacterCount"
                                name="unlockReason"
                                maxLength={300}
                                isTextArea
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
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
