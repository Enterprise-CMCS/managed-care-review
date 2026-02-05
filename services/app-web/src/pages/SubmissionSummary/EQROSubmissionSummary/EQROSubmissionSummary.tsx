import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePage } from '../../../contexts/PageContext'
import { GridContainer, 
    Link, 
    Grid, 
    ModalRef 
} from '@trussworks/react-uswds'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useMemoizedStateHeader, useRouteParams } from '../../../hooks'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useFetchContractWithQuestionsQuery, UpdateInformation, } from '../../../gen/gqlClient'
import {
    DocumentWarningBanner,
    LinkWithLogging,
    Loading,
    SectionCard,
    MultiColumnGrid,
} from '../../../components'
import { SubmissionUnlockedBanner } from '../../../components/Banner'
import { ModalOpenButton, UnlockSubmitModal } from '../../../components/Modal'
import { ErrorForbiddenPage } from '../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../Errors/Error404Page'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { getVisibleLatestContractFormData } from '@mc-review/submissions'
import styles from '../SubmissionSummary.module.scss'
import {
    ContactsSummarySection,
    EQROContractDetailsSummarySection,
    SubmissionTypeSummarySection,
} from '../../../components/SubmissionSummarySection'
import { getSubmissionPath } from '../../../routeHelpers'

export const EQROSubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading, updateActiveMainContent } = usePage()
    const [documentError, setDocumentError] = useState(false)
    const { loggedInUser } = useAuth()
    const { id } = useRouteParams()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isHelpDeskUser = loggedInUser?.role === 'HELPDESK_USER'

    const modalRef = useRef<ModalRef>(null)

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
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: name,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

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
    const isSubmitted =
        submissionStatus === 'SUBMITTED' || submissionStatus === 'RESUBMITTED'
    const statePrograms = contract.state.programs
    const contractSubmissionType = contract.contractSubmissionType
    const consolidatedStatus = contract.consolidatedStatus

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

    const showUnlockBtn =
        hasCMSPermissions &&
        ['SUBMITTED', 'RESUBMITTED','NOT_SUBJECT_TO_REVIEW'].includes(consolidatedStatus)
    const showNoActionsMsg =
        !showUnlockBtn 

    // Get the correct update info depending on the submission status
    let updateInfo: UpdateInformation | undefined = undefined
    if (submissionStatus === 'UNLOCKED' || submissionStatus === 'RESUBMITTED') {
        updateInfo =
            (submissionStatus === 'UNLOCKED'
                ? contract.draftRevision?.unlockInfo
                : contract.packageSubmissions[0].contractRevision.submitInfo) ||
            undefined
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

    const handleDocumentDownloadError = (error: boolean) => {
        if (!documentError) {
            setDocumentError(error)
        }
    }

    const editOrAddMCCRSID = contract.mccrsID
        ? 'Edit MC-CRS number'
        : 'Add MC-CRS record number'
    const explainMissingData = (isHelpDeskUser || isStateUser) && !isSubmitted

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}

                {submissionStatus === 'UNLOCKED' && updateInfo && (
                    <SubmissionUnlockedBanner
                        className={styles.banner}
                        loggedInUser={loggedInUser}
                        unlockedInfo={updateInfo}
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

                <EQROContractDetailsSummarySection
                    contract={contract}
                    onDocumentError={handleDocumentDownloadError}
                    explainMissingData={explainMissingData}
                />

                <ContactsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    explainMissingData={explainMissingData}
                />

                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK_CONTRACT"
                    submissionData={contract}
                />
            </GridContainer>
        </div>
    )
}
