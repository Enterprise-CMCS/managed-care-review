import { Grid, GridContainer, Link, ModalRef } from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ContractDetailsSummarySection } from '../StateSubmission/ReviewSubmit/ContractDetailsSummarySection'
import { ContactsSummarySection } from '../StateSubmission/ReviewSubmit/ContactsSummarySection'
import { RateDetailsSummarySection } from '../StateSubmission/ReviewSubmit/RateDetailsSummarySection'
import { SubmissionTypeSummarySection } from '../StateSubmission/ReviewSubmit/SubmissionTypeSummarySection'
import {
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
    DocumentWarningBanner,
    LinkWithLogging,
    NavLinkWithLogging,
} from '../../components'
import { Loading } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { useFetchContractQuery, UpdateInformation } from '../../gen/gqlClient'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory'
import { ModalOpenButton, UnlockSubmitModal } from '../../components/Modal'
import { RoutesRecord } from '@mc-review/constants'
import { useRouteParams } from '../../hooks'
import { getVisibleLatestContractFormData } from '@mc-review/helpers'
import { generatePath, Navigate } from 'react-router-dom'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { SubmissionApprovedBanner } from '../../components/Banner'

export const SubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const [documentError, setDocumentError] = useState(false)
    const { loggedInUser } = useAuth()
    const { id } = useRouteParams()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isHelpDeskUser = loggedInUser?.role === 'HELPDESK_USER'
    const ldClient = useLDClient()

    const submissionApprovalFlag = ldClient?.variation(
        featureFlags.SUBMISSION_APPROVALS.flag,
        featureFlags.SUBMISSION_APPROVALS.defaultValue
    )

    // API requests
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown-contract',
            },
        },
        fetchPolicy: 'network-only',
    })

    const contract = fetchContractData?.fetchContract.contract
    const name =
        contract && contract?.packageSubmissions.length > 0
            ? contract.packageSubmissions[0].contractRevision.contractName
            : ''

    useEffect(() => {
        updateHeading({
            customHeading: name,
        })
    }, [name, updateHeading])

    if (fetchContractLoading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (fetchContractError) {
        //error handling for a state user that tries to access rates for a different state
        if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'FORBIDDEN'
        ) {
            return (
                <ErrorForbiddenPage
                    errorMsg={fetchContractError.graphQLErrors[0].message}
                />
            )
        } else if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'NOT_FOUND'
        ) {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!contract) {
        return <GenericErrorPage />
    }

    const submissionStatus = contract.status
    const isSubmitted =
        submissionStatus === 'SUBMITTED' || submissionStatus === 'RESUBMITTED'
    const statePrograms = contract.state.programs

    if (!isSubmitted && isStateUser) {
        if (submissionStatus === 'DRAFT') {
            return (
                <Navigate
                    to={generatePath(RoutesRecord.SUBMISSIONS_TYPE, { id })}
                />
            )
        } else {
            return (
                <Navigate
                    to={generatePath(RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT, {
                        id,
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

    const handleDocumentDownloadError = (error: boolean) =>
        setDocumentError(error)

    const editOrAddMCCRSID = contract.mccrsID
        ? 'Edit MC-CRS number'
        : 'Add MC-CRS record number'
    const explainMissingData = (isHelpDeskUser || isStateUser) && !isSubmitted

    const latestContractAction = contract.reviewStatusActions?.[0]

    // Only show for CMS_USER or CMS_APPROVER_USER users
    // and if the submission isn't approved
    const showSubmissionApproval =
        submissionApprovalFlag &&
        hasCMSPermissions &&
        !['APPROVED', 'UNLOCKED'].includes(contract.consolidatedStatus)
    const showApprovalBanner =
        submissionApprovalFlag &&
        contract.reviewStatus === 'APPROVED' &&
        latestContractAction

    const renderStatusAlerts = () => {
        if (showApprovalBanner) {
            return (
                <SubmissionApprovedBanner
                    updatedBy={latestContractAction.updatedBy}
                    updatedAt={latestContractAction.updatedAt}
                    note={latestContractAction.updatedReason}
                />
            )
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

        if (submissionStatus === 'RESUBMITTED' && updateInfo) {
            return (
                <SubmissionUpdatedBanner
                    className={styles.banner}
                    updateInfo={updateInfo}
                />
            )
        }
    }

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {renderStatusAlerts()}

                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}

                {showSubmissionApproval && (
                    <Grid className={styles.releaseToStateContainer} row>
                        <NavLinkWithLogging
                            className="usa-button"
                            variant="unstyled"
                            to={'./released-to-state'}
                        >
                            Released to state
                        </NavLinkWithLogging>
                    </Grid>
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
                                    href={`/submissions/${contract.id}/mccrs-record-number`}
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
                    headerChildComponent={
                        hasCMSPermissions && !showApprovalBanner ? (
                            <ModalOpenButton
                                modalRef={modalRef}
                                disabled={
                                    ['DRAFT', 'UNLOCKED'].includes(
                                        contract.status
                                    ) || contract.reviewStatus === 'APPROVED'
                                }
                                className={styles.submitButton}
                                id="form-submit"
                                outline={showSubmissionApproval}
                            >
                                Unlock submission
                            </ModalOpenButton>
                        ) : undefined
                    }
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
