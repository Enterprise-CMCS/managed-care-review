import {
    GridContainer,
    Icon,
    Link,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
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
    NavLinkWithLogging,
    LinkWithLogging,
} from '../../components'
import { Loading } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { useFetchContractQuery, UpdateInformation } from '../../gen/gqlClient'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory'
import { UnlockSubmitModal } from '../../components/Modal'
import { RoutesRecord } from '../../constants'
import { useRouteParams } from '../../hooks'
import { getVisibleLatestContractFormData } from '../../gqlHelpers/contractsAndRates'
import { generatePath, Navigate } from 'react-router-dom'
import { hasCMSUserPermissions } from '../../gqlHelpers'

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

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {submissionStatus === 'UNLOCKED' && updateInfo && (
                    <SubmissionUnlockedBanner
                        className={styles.banner}
                        loggedInUser={loggedInUser}
                        unlockedInfo={updateInfo}
                    />
                )}

                {submissionStatus === 'RESUBMITTED' && updateInfo && (
                    <SubmissionUpdatedBanner
                        className={styles.banner}
                        updateInfo={updateInfo}
                    />
                )}

                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
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
                                            contract.mccrsID
                                                ? styles.editLink
                                                : ''
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
                            hasCMSPermissions ? (
                                <UnlockModalButton
                                    modalRef={modalRef}
                                    disabled={['DRAFT', 'UNLOCKED'].includes(
                                        contract.status
                                    )}
                                />
                            ) : undefined
                        }
                        statePrograms={statePrograms}
                        initiallySubmittedAt={contract.initiallySubmittedAt}
                        isStateUser={isStateUser}
                        explainMissingData={explainMissingData}
                    />

                {
                    <ContractDetailsSummarySection
                        contract={contract}
                        isCMSUser={hasCMSPermissions}
                        isStateUser={isStateUser}
                        submissionName={name}
                        onDocumentError={handleDocumentDownloadError}
                        explainMissingData={explainMissingData}
                    />
                }

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

                {
                    <ContactsSummarySection
                        contract={contract}
                        isStateUser={isStateUser}
                        explainMissingData={explainMissingData}
                    />
                }

                {<ChangeHistory contract={contract} />}
                {
                    <UnlockSubmitModal
                        modalRef={modalRef}
                        modalType="UNLOCK_CONTRACT"
                        submissionData={contract}
                    />
                }
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
