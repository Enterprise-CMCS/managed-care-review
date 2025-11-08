import { GridContainer, Link, ModalRef, Grid } from '@trussworks/react-uswds'
import React, { useEffect, useMemo, useRef, useState } from 'react'
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
} from '../../components'
import { Loading } from '../../components'
import { usePage } from '../../contexts/PageContext'
import {
    UpdateInformation,
    useFetchContractWithQuestionsQuery,
} from '../../gen/gqlClient'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory'
import { ModalOpenButton, UnlockSubmitModal } from '../../components/Modal'
import { RoutesRecord } from '@mc-review/constants'
import { useRouteParams } from '../../hooks'
import {
    getVisibleLatestContractFormData,
    getVisibleLatestRateRevisions,
} from '@mc-review/submissions'
import {
    generatePath,
    Navigate,
    useNavigate,
    useSearchParams,
} from 'react-router-dom'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import {
    SubmissionApprovedBanner,
    IncompleteSubmissionBanner,
    SubmissionWithdrawnBanner,
    StatusUpdatedBanner,
} from '../../components/Banner'
import { MultiColumnGrid } from '../../components/MultiColumnGrid/MultiColumnGrid'

export interface SubmissionSummaryFormValues {
    dateApprovalReleasedToState: string
}

export const SubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading, updateActiveMainContent } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const [documentError, setDocumentError] = useState(false)
    const [showTempUndoWithdrawBanner, setShowTempUndoWithdrawBanner] =
        useState<boolean>(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const { loggedInUser } = useAuth()
    const { id, contractSubmissionType } = useRouteParams()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
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
    const { data, loading, error } = useFetchContractWithQuestionsQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown-contract',
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const contract = data?.fetchContract.contract
    const name =
        contract && contract?.packageSubmissions.length > 0
            ? contract.packageSubmissions[0].contractRevision.contractName
            : ''
    const activeMainContentId = 'submissionSummaryPageMainContent'

    useEffect(() => {
        if (searchParams.get('showTempUndoWithdrawBanner') === 'true') {
            setShowTempUndoWithdrawBanner(true)

            //This ensures the banner goes away upon refresh or navigation
            searchParams.delete('showTempUndoWithdrawBanner')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams])

    // Setting app wide variables
    useEffect(() => {
        updateHeading({
            customHeading: name,
        })
    }, [name, updateHeading])

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
        if (error?.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN') {
            return (
                <ErrorForbiddenPage errorMsg={error.graphQLErrors[0].message} />
            )
        } else if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!contract) {
        return <GenericErrorPage />
    }

    const submissionStatus = contract.status
    const consolidatedStatus = contract.consolidatedStatus
    const isSubmitted =
        submissionStatus === 'SUBMITTED' || submissionStatus === 'RESUBMITTED'
    const statePrograms = contract.state.programs

    if (!isSubmitted && isStateUser) {
        if (submissionStatus === 'DRAFT') {
            return (
                <Navigate
                    to={generatePath(RoutesRecord.SUBMISSIONS_TYPE, {
                        id,
                        contractSubmissionType,
                    })}
                />
            )
        } else {
            return (
                <Navigate
                    to={generatePath(RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT, {
                        id,
                        contractSubmissionType,
                    })}
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
        hasCMSPermissions &&
        ['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)
    const showUnlockBtn =
        hasCMSPermissions &&
        ['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)
    const showWithdrawBtn =
        hasCMSPermissions &&
        withdrawSubmissionFlag &&
        ['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)
    const showUndoWithdrawBtn =
        hasCMSPermissions &&
        undoWithdrawSubmissionFlag &&
        consolidatedStatus === 'WITHDRAWN'
    const showNoActionsMsg =
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
        contract.reviewStatusActions?.[1].actionType === 'WITHDRAW'
    const showPermUndoWithdrawBanner =
        undoWithdrawAction && undoWithdrawSubmissionFlag && isStateUser

    const renderStatusAlerts = () => {
        if (showApprovalBanner) {
            return (
                <SubmissionApprovedBanner
                    updatedBy={latestContractAction.updatedBy}
                    updatedAt={latestContractAction.updatedAt}
                    dateReleasedToState={
                        latestContractAction.dateApprovalReleasedToState
                    }
                />
            )
        }

        if (showTempUndoWithdrawBanner) {
            return <StatusUpdatedBanner />
        }

        if (showWithdrawnBanner) {
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
            return <StatusUpdatedBanner />
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
    }

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {showIncompleteRateError && (
                    <IncompleteSubmissionBanner message={incompleteMessage} />
                )}

                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}

                {renderStatusAlerts()}

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
                                        disabled={
                                            ['DRAFT', 'UNLOCKED'].includes(
                                                contract.status
                                            ) ||
                                            contract.reviewStatus === 'APPROVED'
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
                                {showWithdrawBtn && (
                                    <ButtonWithLogging
                                        type="button"
                                        outline
                                        className="usa-button"
                                        onClick={() =>
                                            navigate(
                                                `/submission-reviews/${contractSubmissionType}/${contract.id}/withdraw-submission`
                                            )
                                        }
                                        link_url={`/submission-reviews/${contractSubmissionType}/${contract.id}/withdraw-submission`}
                                    >
                                        Withdraw submission
                                    </ButtonWithLogging>
                                )}
                                {showUndoWithdrawBtn && (
                                    <ButtonWithLogging
                                        className="usa-button usa-button--outline"
                                        type="button"
                                        outline
                                        onClick={() =>
                                            navigate(
                                                `/submission-reviews/${contractSubmissionType}/${contract.id}/undo-withdraw-submission`
                                            )
                                        }
                                        link_url={`/submission-reviews/${contractSubmissionType}/${contract.id}/undo-withdraw-submission`}
                                        style={{ width: '16rem' }}
                                    >
                                        Undo submission withdraw
                                    </ButtonWithLogging>
                                )}
                            </MultiColumnGrid>
                        )}
                    </SectionCard>
                )}

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
                                    href={`/submissions/${contractSubmissionType}/${contract.id}/mccrs-record-number`}
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
                    statePrograms={statePrograms}
                    initiallySubmittedAt={contract.initiallySubmittedAt}
                    isStateUser={isStateUser}
                    explainMissingData={explainMissingData}
                />

                <ContractDetailsSummarySection
                    contract={contract}
                    isCMSUser={hasCMSPermissions}
                    isStateUser={isStateUser}
                    submissionName={name}
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

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
