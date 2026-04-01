import { gql, useMutation, useQuery } from '@apollo/client'
import {
    FormGroup,
    Grid,
    GridContainer,
    ModalRef,
    Textarea,
} from '@trussworks/react-uswds'
import { formatCalendarDate } from '@mc-review/dates'
import { typedStatePrograms } from '@mc-review/submissions'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, generatePath } from 'react-router-dom'
import {
    DataDetail,
    DataDetailContactField,
    NavLinkWithLogging,
    MultiColumnGrid,
    Loading,
    PoliteErrorMessage,
    SectionCard,
    SectionHeader,
    UploadedDocumentsTable,
} from '../../../components'
import { SubmissionUnlockedBanner } from '../../../components/Banner'
import { Modal, ModalOpenButton } from '../../../components/Modal'
import { StatusTag } from '../../../components/ContractTable/ContractTable'
import { useAuth } from '../../../contexts/AuthContext'
import { usePage } from '../../../contexts/PageContext'
import { GenericDocument, useFetchContractQuery } from '../../../gen/gqlClient'
import { useMemoizedStateHeader, useRouteParams } from '../../../hooks'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { Error404 } from '../../Errors/Error404Page'
import { ErrorForbiddenPage } from '../../Errors/ErrorForbiddenPage'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import styles from '../SubmissionSummary.module.scss'
import { RoutesRecord } from '@mc-review/constants'
import { getSubmissionPath } from '../../../routeHelpers'

const FETCH_SDP_QUERY = gql`
    query fetchSDPSubmissionSummary($input: FetchSDPInput!) {
        fetchSDP(input: $input) {
            sdp {
                id
                status
                stateCode
                stateNumber
                mccrsID
                draftRevision {
                    id
                    updatedAt
                    unlockInfo {
                        updatedAt
                        updatedReason
                        updatedBy {
                            email
                            role
                            familyName
                            givenName
                        }
                    }
                    formData {
                        submissionType
                        programIDs
                        changesIncluded
                        ratingPeriodStart
                        ratingPeriodEnd
                        estimatedFederalShare
                        estimatedStateShare
                        automaticallyRenewed
                        stateContacts {
                            name
                            titleRole
                            email
                        }
                    }
                    sdpDocuments {
                        id
                        name
                        s3URL
                        sha256
                        dateAdded
                        downloadURL
                        s3BucketName
                        s3Key
                    }
                }
                latestSubmittedRevision {
                    id
                    updatedAt
                    formData {
                        submissionType
                        programIDs
                        changesIncluded
                        ratingPeriodStart
                        ratingPeriodEnd
                        estimatedFederalShare
                        estimatedStateShare
                        automaticallyRenewed
                        stateContacts {
                            name
                            titleRole
                            email
                        }
                    }
                    sdpDocuments {
                        id
                        name
                        s3URL
                        sha256
                        dateAdded
                        downloadURL
                        s3BucketName
                        s3Key
                    }
                }
                relatedContracts {
                    id
                }
            }
        }
    }
`

const UNLOCK_SDP_MUTATION = gql`
    mutation unlockSDPSubmission($input: UnlockSDPInput!) {
        unlockSDP(input: $input) {
            sdp {
                id
                status
                draftRevision {
                    id
                    updatedAt
                }
            }
        }
    }
`

const sdpSubmissionName = (stateCode: string, stateNumber: number) =>
    `MCR-${stateCode}-${String(stateNumber).padStart(4, '0')}-SDP`

const formatSubmissionType = (value?: string) => {
    switch (value) {
        case 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT':
            return 'New state directed payment preprint'
        case 'AMENDMENT_TO_AN_APPROVED_PREPRINT':
            return 'Amendment to an approved preprint'
        case 'RENEWAL_FOR_NEW_RATING_PERIOD':
            return 'Renewal for new rating period'
        default:
            return 'Not provided'
    }
}

const formatChange = (value: string) => {
    switch (value) {
        case 'RATING_PERIOD':
            return 'Rating period'
        case 'PAYMENT_TYPE':
            return 'Payment type'
        case 'PROVIDER_TYPE':
            return 'Provider type'
        case 'QUALITY_METRICS_OR_BENCHMARKS':
            return 'Quality metrics or benchmarks'
        case 'OTHER':
            return 'Other'
        default:
            return value
    }
}

const formatProgramNames = (stateCode: string, programIDs: string[]) => {
    const programs =
        typedStatePrograms.states.find((state) => state.code === stateCode)
            ?.programs ?? []

    const selectedProgramNames = programIDs.map(
        (programID) =>
            programs.find((program) => program.id === programID)?.name ??
            'Unknown Program'
    )

    return selectedProgramNames.join(', ')
}

const formatDateRange = (startDate: string, endDate: string) =>
    `${formatCalendarDate(
        new Date(startDate),
        'America/Los_Angeles'
    )} to ${formatCalendarDate(new Date(endDate), 'America/Los_Angeles')}`

const formatAutoRenewed = (automaticallyRenewed: boolean) =>
    automaticallyRenewed ? 'Yes' : 'No'

const LinkedContractSummaryLink = ({
    contractID,
}: {
    contractID: string
}): React.ReactElement | null => {
    const { data } = useFetchContractQuery({
        variables: {
            input: {
                contractID,
            },
        },
        fetchPolicy: 'cache-first',
    })

    const contract = data?.fetchContract.contract

    if (!contract || contract.contractSubmissionType === 'SDP') {
        return null
    }

    const contractName =
        contract.draftRevision?.contractName ??
        contract.packageSubmissions?.[0]?.contractRevision.contractName ??
        `MCR-${contract.stateCode}-${String(contract.stateNumber).padStart(
            4,
            '0'
        )}`

    return (
        <div>
            <NavLinkWithLogging
                to={getSubmissionPath(
                    'SUBMISSIONS_SUMMARY',
                    contract.contractSubmissionType,
                    contract.id
                )}
            >
                {contractName}
            </NavLinkWithLogging>
        </div>
    )
}

export const SDPSubmissionSummary = (): React.ReactElement => {
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const { id } = useRouteParams()
    const activeMainContentId = 'sdpSubmissionSummaryPageMainContent'
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    const modalRef = useRef<ModalRef>(null)
    const [unlockReason, setUnlockReason] = useState('')
    const [unlockError, setUnlockError] = useState<string>()
    const [unlockSDP, { loading: unlockLoading }] =
        useMutation(UNLOCK_SDP_MUTATION)

    const { data, loading, error, refetch } = useQuery(FETCH_SDP_QUERY, {
        variables: {
            input: {
                sdpID: id ?? 'unknown-sdp',
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const sdp = data?.fetchSDP?.sdp
    const stateName = sdp?.stateCode
        ? (typedStatePrograms.states.find(
              (state) => state.code === sdp.stateCode
          )?.name ?? sdp.stateCode)
        : undefined
    const submissionName =
        sdp && sdp.stateCode
            ? sdpSubmissionName(sdp.stateCode, sdp.stateNumber)
            : ''

    const stateHeader = useMemoizedStateHeader({
        subHeaderText: submissionName,
        stateCode: sdp?.stateCode,
        stateName,
        contractType: 'SDP',
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (!data && loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (!data && error) {
        if (error?.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN') {
            return (
                <ErrorForbiddenPage errorMsg={error.graphQLErrors[0].message} />
            )
        } else if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!sdp || !loggedInUser) {
        return <GenericErrorPage />
    }

    const showUnlockBtn =
        hasCMSPermissions && ['SUBMITTED', 'RESUBMITTED'].includes(sdp.status)
    const showNoActionsMsg = !showUnlockBtn
    const latestVisibleRevision =
        sdp.latestSubmittedRevision ?? sdp.draftRevision ?? undefined

    if (isStateUser && sdp.status === 'DRAFT') {
        return (
            <Navigate
                to={generatePath(RoutesRecord.SUBMISSIONS_SDP_DETAILS, {
                    id: sdp.id,
                })}
            />
        )
    }

    if (isStateUser && sdp.status === 'UNLOCKED') {
        return (
            <Navigate
                to={generatePath(RoutesRecord.SUBMISSIONS_SDP_REVIEW_SUBMIT, {
                    id: sdp.id,
                })}
            />
        )
    }

    if (!latestVisibleRevision) {
        return <GenericErrorPage />
    }

    const handleUnlock = async () => {
        const trimmedUnlockReason = unlockReason.trim()
        if (!trimmedUnlockReason) {
            setUnlockError(
                'You must provide a reason for unlocking this submission'
            )
            return
        }

        try {
            const result = await unlockSDP({
                variables: {
                    input: {
                        sdpID: sdp.id,
                        unlockedReason: trimmedUnlockReason,
                    },
                },
            })

            if (result.data?.unlockSDP?.sdp?.status !== 'UNLOCKED') {
                setUnlockError('There was a problem unlocking the SDP.')
                return
            }

            setUnlockError(undefined)
            setUnlockReason('')
            modalRef.current?.toggleModal(undefined, false)
            await refetch()
        } catch {
            setUnlockError('There was a problem unlocking the SDP.')
        }
    }

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer
                data-testid="sdp-submission-summary"
                className={styles.container}
            >
                <StatusTag status={sdp.status} notStateUser={!isStateUser} />

                <h1 className={styles.eqroSummaryNameHeader}>
                    {submissionName}
                </h1>

                {sdp.status === 'UNLOCKED' && sdp.draftRevision?.unlockInfo && (
                    <SubmissionUnlockedBanner
                        className={styles.banner}
                        loggedInUser={loggedInUser}
                        unlockedInfo={sdp.draftRevision.unlockInfo}
                    />
                )}

                {hasCMSPermissions && (
                    <SectionCard className={styles.actionsSection}>
                        <h3>Actions</h3>
                        {showNoActionsMsg ? (
                            <Grid>
                                No action can be taken on this submission in its
                                current status.
                            </Grid>
                        ) : (
                            <MultiColumnGrid columns={3}>
                                {showUnlockBtn && (
                                    <ModalOpenButton
                                        modalRef={modalRef}
                                        className={styles.submitButton}
                                        id="form-submit"
                                    >
                                        Unlock submission
                                    </ModalOpenButton>
                                )}
                            </MultiColumnGrid>
                        )}
                    </SectionCard>
                )}

                <SectionCard>
                    <SectionHeader
                        header="Submission details"
                        fontSize="38px"
                        hideBorderTop
                        hideBorderBottom
                    />
                    <dl>
                        <DataDetail
                            id="sdp-summary-submission-type"
                            label="Submission type"
                        >
                            {formatSubmissionType(
                                latestVisibleRevision.formData.submissionType
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-programs"
                            label="Programs this action covers"
                        >
                            {formatProgramNames(
                                sdp.stateCode,
                                latestVisibleRevision.formData.programIDs
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-changes"
                            label="Changes included in this preprint"
                        >
                            {latestVisibleRevision.formData.changesIncluded
                                .map(formatChange)
                                .join(', ')}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-rating-period"
                            label="Rating period for which this payment arrangement will apply"
                        >
                            {formatDateRange(
                                latestVisibleRevision.formData
                                    .ratingPeriodStart,
                                latestVisibleRevision.formData.ratingPeriodEnd
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-fed-share"
                            label="Estimated federal share"
                        >
                            {latestVisibleRevision.formData
                                .estimatedFederalShare || 'Not provided'}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-state-share"
                            label="Estimated state share"
                        >
                            {latestVisibleRevision.formData
                                .estimatedStateShare || 'Not provided'}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-auto-renewed"
                            label="Is this payment arrangement renewed automatically?"
                        >
                            {formatAutoRenewed(
                                latestVisibleRevision.formData
                                    .automaticallyRenewed
                            )}
                        </DataDetail>
                    </dl>
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        header="SDP details"
                        fontSize="38px"
                        hideBorderTop
                        hideBorderBottom
                    />
                    <dl>
                        <DataDetail
                            id="sdp-summary-related-contracts"
                            label="Related contracts"
                        >
                            {sdp.relatedContracts.length > 0 ? (
                                <div>
                                    {sdp.relatedContracts.map(
                                        (contract: { id: string }) => (
                                            <LinkedContractSummaryLink
                                                key={contract.id}
                                                contractID={contract.id}
                                            />
                                        )
                                    )}
                                </div>
                            ) : (
                                'No related contracts added'
                            )}
                        </DataDetail>
                    </dl>
                    <UploadedDocumentsTable
                        documents={
                            latestVisibleRevision.sdpDocuments as GenericDocument[]
                        }
                        previousSubmissionDate={null}
                        caption="SDP documents"
                        documentCategory="SDP"
                        hideDynamicFeedback
                    />
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        header="State contacts"
                        fontSize="38px"
                        hideBorderTop
                        hideBorderBottom
                    />
                    <dl>
                        {latestVisibleRevision.formData.stateContacts.length >
                        0 ? (
                            latestVisibleRevision.formData.stateContacts.map(
                                (contact: any, index: number) => (
                                    <DataDetail
                                        key={`sdp-summary-contact-${index}`}
                                        id={`sdp-summary-contact-${index}`}
                                        label={`State contact ${index + 1}`}
                                    >
                                        <DataDetailContactField
                                            contact={contact}
                                        />
                                    </DataDetail>
                                )
                            )
                        ) : (
                            <DataDetail
                                id="sdp-summary-no-contacts"
                                label="State contacts"
                            >
                                Not provided
                            </DataDetail>
                        )}
                    </dl>
                </SectionCard>
            </GridContainer>
            <Modal
                id="unlockSDPModal"
                modalRef={modalRef}
                modalHeading="Reason for unlocking submission"
                onSubmit={() => void handleUnlock()}
                onCancel={() => {
                    setUnlockReason('')
                    setUnlockError(undefined)
                }}
                onSubmitText="Unlock"
                isSubmitting={unlockLoading}
            >
                <FormGroup error={Boolean(unlockError)}>
                    <label className="usa-label" htmlFor="unlockSDPReason">
                        Provide reason for unlocking
                    </label>
                    {unlockError && (
                        <PoliteErrorMessage formFieldLabel="Unlock reason">
                            {unlockError}
                        </PoliteErrorMessage>
                    )}
                    <Textarea
                        id="unlockSDPReason"
                        name="unlockSDPReason"
                        value={unlockReason}
                        onChange={(event) => {
                            setUnlockReason(event.target.value)
                            if (unlockError) {
                                setUnlockError(undefined)
                            }
                        }}
                    />
                </FormGroup>
            </Modal>
        </div>
    )
}
