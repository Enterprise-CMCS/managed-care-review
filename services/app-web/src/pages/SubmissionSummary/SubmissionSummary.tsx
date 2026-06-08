import { GridContainer, Link, ModalRef, Grid } from '@trussworks/react-uswds'
import React, {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
    ContractDetailsSummarySection,
    ContactsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
} from '../../components/SubmissionSummarySection'
import {
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
    DocumentWarningBanner,
    LinkWithLogging,
    NavLinkWithLogging,
    SectionCard,
    ButtonWithLogging,
    MultiColumnGrid,
    Loading,
} from '../../components'
import { usePage } from '../../contexts/PageContext'
import {
    UpdateInformation,
    FetchContractWithQuestionsDocument,
} from '../../gen/gqlClient'
import { useQuery } from '@apollo/client/react'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory'
import { ModalOpenButton, UnlockSubmitModal } from '../../components/Modal'
import { useMemoizedStateHeader, useRouteParams } from '../../hooks'
import {
    getVisibleLatestContractFormData,
    getVisibleLatestRateRevisions,
} from '@mc-review/submissions'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { hasCMSUserPermissions, toGQLError } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import {
    SubmissionApprovedBanner,
    IncompleteSubmissionBanner,
    SubmissionWithdrawnBanner,
    StatusUpdatedBanner,
} from '../../components/Banner'
import { getSubmissionPath } from '../../routeHelpers'
import { StatusTag } from '../../components/ContractTable'
import { ChipOnlySubmissionBanner } from '../../components/Banner/ChipOnlySubmissionBanner/ChipOnlySubmissionBanner'

export const SubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading, updateActiveMainContent } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const [documentError, setDocumentError] = useState(false)
    const [showTempUndoWithdrawBanner, setShowTempUndoWithdrawBanner] =
        useState<boolean>(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const { loggedInUser } = useAuth()
    const { id } = useRouteParams()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isHelpDeskUser = loggedInUser?.role === 'HELPDESK_USER'
    const navigate = useNavigate()
    const ldClient = useLDClient()

    const withdrawSubmissionFlag = ldClient?.variation(
        featureFlags.WITHDRAW_SUBMISSION.flag,
        featureFlags.WITHDRAW_SUBMISSION.defaultValue
    )

    const undoWithdrawSubmissionFlag = ldClient?.variation(
        featureFlags.UNDO_WITHDRAW_SUBMISSION.flag,
        featureFlags.UNDO_WITHDRAW_SUBMISSION.defaultValue
    )

    const incompleteMessage = useMemo(() => {
        if (isStateUser) {
            return 'You must contact your CMS point of contact and request an unlock to complete the submission.'
        }

        if (hasCMSPermissions) {
            return 'You must unlock the submission so the state can add a rate certification.'
        }

        return 'CMS must unlock the submission so the state can add a rate certification.'
    }, [isStateUser, hasCMSPermissions])

    // API requests
    const { data, loading, error } = useQuery(
        FetchContractWithQuestionsDocument,
        {
            variables: {
                input: {
                    contractID: id ?? 'unknown-contract',
                },
            },
            fetchPolicy: 'cache-and-network',
        }
    )

    const contract = data?.fetchContract.contract
    const name =
        contract && contract?.packageSubmissions.length > 0
            ? contract.packageSubmissions[0].contractRevision.contractName
            : ''
    const activeMainContentId = 'submissionSummaryPageMainContent'

    const stateHeader = useMemoizedStateHeader({
        subHeaderText: name,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useEffect(() => {
        if (searchParams.get('showTempUndoWithdrawBanner') === 'true') {
            setShowTempUndoWithdrawBanner(true)

            //This ensures the banner goes away upon refresh or navigation
            searchParams.delete('showTempUndoWithdrawBanner')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams])

    // Setting app wide variables
    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // Handle loading and error states for fetching data while using cached data
    if (!data && loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (!data && error) {
        const gqlError = toGQLError(error)
        if (gqlError?.extensions.code === 'FORBIDDEN') {
            return <ErrorForbiddenPage errorMsg={gqlError.message} />
        } else if (gqlError?.extensions.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!contract) {
        return <GenericErrorPage />
    }

    const submissionStatus = contract.status
    const consolidatedStatus = contract.consolidatedStatus
    const contractSubmissionType = contract.contractSubmissionType

    const isSubmitted =
        submissionStatus === 'SUBMITTED' || submissionStatus === 'RESUBMITTED'
    const statePrograms = contract.state.programs

    if (!isSubmitted && isStateUser) {
        if (submissionStatus === 'DRAFT') {
            return (
                <Navigate
                    to={getSubmissionPath(
                        'SUBMISSIONS_TYPE',
                        contractSubmissionType,
                        contract.id
                    )}
                />
            )
        } else {
            return (
                <Navigate
                    to={getSubmissionPath(
                        'SUBMISSIONS_REVIEW_SUBMIT',
                        contractSubmissionType,
                        contract.id
                    )}
                />
            )
        }
    }

    const contractFormData = getVisibleLatestContractFormData(
        contract,
        isStateUser
    )

    if (
        !contractFormData ||
        !statePrograms ||
        contract.packageSubmissions.length === 0
    ) {
        console.error(
            'missing fundamental contract data inside submission summary'
        )
        return <GenericErrorPage />
    }

    // Get the correct update info depending on the submission status
    let updateInfo: UpdateInformation | undefined = undefined
    if (submissionStatus === 'UNLOCKED' || submissionStatus === 'RESUBMITTED') {
        updateInfo =
            (submissionStatus === 'UNLOCKED'
                ? contract.draftRevision?.unlockInfo
                : contract.packageSubmissions[0].contractRevision.submitInfo) ||
            undefined
    }

    const isContractActionAndRateCertification =
        contractFormData?.submissionType === 'CONTRACT_AND_RATES'
    const isCHIPOnly = contractFormData?.populationCovered === 'CHIP'

    const rateRevisions = getVisibleLatestRateRevisions(contract, false) || []

    // Show incomplete submission banner if rates are missing
    const showIncompleteRateError =
        isSubmitted &&
        isContractActionAndRateCertification &&
        rateRevisions.length === 0

    const handleDocumentDownloadError = (error: boolean) => {
        if (!documentError) {
            setDocumentError(error)
        }
    }

    const editOrAddMCCRSID = contract.mccrsID
        ? 'Edit MC-CRS number'
        : 'Add MC-CRS record number'
    const explainMissingData = (isHelpDeskUser || isStateUser) && !isSubmitted

    const latestContractAction = contract.reviewStatusActions?.[0]

    const showApprovalBtn =
        (hasCMSPermissions || isAdminUser) &&
        ['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)
    const showUnlockBtn =
        hasCMSPermissions &&
        ['SUBMITTED', 'RESUBMITTED', 'NOT_SUBJECT_TO_REVIEW'].includes(
            consolidatedStatus
        )
    const showWithdrawBtn =
        hasCMSPermissions &&
        withdrawSubmissionFlag &&
        ['SUBMITTED', 'RESUBMITTED', 'NOT_SUBJECT_TO_REVIEW'].includes(
            consolidatedStatus
        )
    const showUndoWithdrawBtn =
        hasCMSPermissions &&
        undoWithdrawSubmissionFlag &&
        consolidatedStatus === 'WITHDRAWN'
    const showUndoUnlockBtn = isAdminUser && consolidatedStatus === 'UNLOCKED'
    const showNoAdminActionsMsg = !showUndoUnlockBtn && !showApprovalBtn
    const showNoCMSActionsMsg =
        !showApprovalBtn &&
        !showUnlockBtn &&
        !showWithdrawBtn &&
        !showUndoWithdrawBtn
    const showApprovalBanner =
        consolidatedStatus === 'APPROVED' && latestContractAction
    const showWithdrawnBanner =
        withdrawSubmissionFlag &&
        consolidatedStatus === 'WITHDRAWN' &&
        latestContractAction
    const undoWithdrawAction =
        latestContractAction?.actionType === 'UNDER_REVIEW' &&
        contract.reviewStatusActions?.[1]?.actionType === 'WITHDRAW'
    const showPermUndoWithdrawBanner =
        undoWithdrawAction && undoWithdrawSubmissionFlag && isStateUser
    const showChipOnlyBanner =
        consolidatedStatus === 'NOT_SUBJECT_TO_REVIEW' && isCHIPOnly

    const renderStatusAlerts = () => {
        if (showApprovalBanner && latestContractAction.updatedBy) {
            return (
                <SubmissionApprovedBanner
                    className={styles.banner}
                    updatedBy={latestContractAction.updatedBy}
                    updatedAt={latestContractAction.updatedAt}
                    dateReleasedToState={
                        latestContractAction.dateApprovalReleasedToState
                    }
                />
            )
        }

        if (showTempUndoWithdrawBanner) {
            return <StatusUpdatedBanner className={styles.banner} />
        }

        if (showWithdrawnBanner && latestContractAction.updatedBy) {
            return (
                <SubmissionWithdrawnBanner
                    className={styles.banner}
                    withdrawInfo={{
                        updatedReason:
                            latestContractAction?.updatedReason ?? '',
                        updatedAt: latestContractAction.updatedAt,
                        updatedBy: latestContractAction.updatedBy,
                    }}
                />
            )
        }

        if (showPermUndoWithdrawBanner) {
            return <StatusUpdatedBanner className={styles.banner} />
        }

        if (submissionStatus === 'UNLOCKED' && updateInfo) {
            return (
                <SubmissionUnlockedBanner
                    className={styles.banner}
                    loggedInUser={loggedInUser}
                    unlockedInfo={updateInfo}
                />
            )
        }

        if (
            submissionStatus === 'RESUBMITTED' &&
            consolidatedStatus !== 'WITHDRAWN' &&
            !undoWithdrawAction &&
            updateInfo
        ) {
            return (
                <SubmissionUpdatedBanner
                    className={styles.banner}
                    updateInfo={updateInfo}
                />
            )
        }

        if (isStateUser && showChipOnlyBanner) {
            return <ChipOnlySubmissionBanner className={styles.banner} />
        }
    }

    const renderActionSection = () => {
        if (!isAdminUser && !hasCMSPermissions) {
            return null
        }

        const showNoActionsMsg = isAdminUser
            ? showNoAdminActionsMsg
            : showNoCMSActionsMsg

        return (
            <SectionCard className={styles.actionsSection}>
                <h4 className="mcr-h4-bold">Actions</h4>
                {showNoActionsMsg ? (
                    <Grid>
                        No action can be taken on this submission in its current
                        status.
                    </Grid>
                ) : (
                    <MultiColumnGrid columns={3}>
                        {isAdminUser && showUndoUnlockBtn && (
                            <ButtonWithLogging
                                className="usa-button usa-button--outline"
                                type="button"
                                onClick={() =>
                                    navigate(
                                        getSubmissionPath(
                                            'UNDO_SUBMISSION_UNLOCK',
                                            contractSubmissionType,
                                            contract.id
                                        )
                                    )
                                }
                                link_url={getSubmissionPath(
                                    'UNDO_SUBMISSION_UNLOCK',
                                    contractSubmissionType,
                                    contract.id
                                )}
                            >
                                Undo submission unlock
                            </ButtonWithLogging>
                        )}
                        {hasCMSPermissions && showUnlockBtn && (
                            <ModalOpenButton
                                modalRef={modalRef}
                                disabled={
                                    ['DRAFT', 'UNLOCKED'].includes(
                                        contract.status
                                    ) || contract.reviewStatus === 'APPROVED'
                                }
                                className={styles.submitButton}
                                id="form-submit"
                            >
                                Unlock submission
                            </ModalOpenButton>
                        )}
                        {showApprovalBtn && (
                            <NavLinkWithLogging
                                className="usa-button bg-green"
                                variant="unstyled"
                                to={'./released-to-state'}
                            >
                                Released to state
                            </NavLinkWithLogging>
                        )}
                        {hasCMSPermissions && showWithdrawBtn && (
                            <ButtonWithLogging
                                type="button"
                                outline
                                className="usa-button"
                                onClick={() =>
                                    navigate(
                                        getSubmissionPath(
                                            'SUBMISSION_WITHDRAW',
                                            contractSubmissionType,
                                            contract.id
                                        )
                                    )
                                }
                                link_url={getSubmissionPath(
                                    'SUBMISSION_WITHDRAW',
                                    contractSubmissionType,
                                    contract.id
                                )}
                            >
                                Withdraw submission
                            </ButtonWithLogging>
                        )}
                        {hasCMSPermissions && showUndoWithdrawBtn && (
                            <ButtonWithLogging
                                className="usa-button usa-button--outline"
                                type="button"
                                outline
                                onClick={() =>
                                    navigate(
                                        getSubmissionPath(
                                            'UNDO_SUBMISSION_WITHDRAW',
                                            contractSubmissionType,
                                            contract.id
                                        )
                                    )
                                }
                                link_url={getSubmissionPath(
                                    'UNDO_SUBMISSION_WITHDRAW',
                                    contractSubmissionType,
                                    contract.id
                                )}
                                style={{ width: '16rem' }}
                            >
                                Undo submission withdraw
                            </ButtonWithLogging>
                        )}
                    </MultiColumnGrid>
                )}
            </SectionCard>
        )
    }

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                <StatusTag
                    status={consolidatedStatus}
                    notStateUser={!isStateUser}
                />

                <h1 className={styles.eqroSummaryNameHeader}>
                    Submission summary
                </h1>
                {showIncompleteRateError && (
                    <IncompleteSubmissionBanner message={incompleteMessage} />
                )}

                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}

                {renderStatusAlerts()}
                {renderActionSection()}

                <SubmissionTypeSummarySection
                    subHeaderComponent={
                        hasCMSPermissions ? (
                            <div className={styles.subHeader}>
                                {contract.mccrsID && (
                                    <span className={styles.mccrsID}>
                                        MC-CRS record number:
                                        <Link
                                            href={`https://mccrs.internal.cms.gov/Home/Index/${contract.mccrsID}`}
                                            aria-label="MC-CRS system login"
                                        >
                                            {contract.mccrsID}
                                        </Link>
                                    </span>
                                )}
                                <LinkWithLogging
                                    href={getSubmissionPath(
                                        'SUBMISSIONS_MCCRSID',
                                        contractSubmissionType,
                                        contract.id
                                    )}
                                    className={
                                        contract.mccrsID ? styles.editLink : ''
                                    }
                                    aria-label={editOrAddMCCRSID}
                                >
                                    {editOrAddMCCRSID}
                                </LinkWithLogging>
                            </div>
                        ) : undefined
                    }
                    contract={contract}
                    submissionName={name}
                    initiallySubmittedAt={contract.initiallySubmittedAt}
                    isStateUser={isStateUser}
                    explainMissingData={explainMissingData}
                />

                <ContractDetailsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    onDocumentError={handleDocumentDownloadError}
                    explainMissingData={explainMissingData}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        contract={contract}
                        submissionName={name}
                        isCMSUser={hasCMSPermissions}
                        statePrograms={statePrograms}
                        onDocumentError={handleDocumentDownloadError}
                        explainMissingData={explainMissingData}
                    />
                )}

                <ContactsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    explainMissingData={explainMissingData}
                />

                <ChangeHistory contract={contract} />

                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK_CONTRACT"
                    submissionData={contract}
                />
            </GridContainer>
        </div>
    )
}
