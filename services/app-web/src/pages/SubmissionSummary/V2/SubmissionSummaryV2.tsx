import {
    GridContainer,
    Icon,
    Link,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { ContractDetailsSummarySectionV2 } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContractDetailsSummarySectionV2'
import { ContactsSummarySection } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContactsSummarySectionV2'
import { RateDetailsSummarySectionV2 } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/RateDetailsSummarySectionV2'
import { SubmissionTypeSummarySectionV2 } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/SubmissionTypeSummarySectionV2'
import {
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
    DocumentWarningBanner,
} from '../../../components'
import { Loading } from '../../../components'
import { usePage } from '../../../contexts/PageContext'
import {
    useFetchContractQuery,
    UpdateInformation,
} from '../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../Errors/Error404Page'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import styles from '../SubmissionSummary.module.scss'
import { ChangeHistoryV2 } from '../../../components/ChangeHistory/ChangeHistoryV2'
import { UnlockSubmitModalV2 } from '../../../components/Modal/V2/UnlockSubmitModalV2'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import { RoutesRecord } from '../../../constants'
import { useRouteParams } from '../../../hooks'
import { getVisibleLatestContractFormData } from '../../../gqlHelpers/contractsAndRates'

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

export const SubmissionSummaryV2 = (): React.ReactElement => {
    // Page level state
    const { updateHeading } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const [documentError, setDocumentError] = useState(false)
    const { loggedInUser } = useAuth()

    const { id } = useRouteParams()

    const ldClient = useLDClient()
    const showQuestionResponse = ldClient?.variation(
        featureFlags.CMS_QUESTIONS.flag,
        featureFlags.CMS_QUESTIONS.defaultValue
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
    } else if (
        fetchContractError ||
        !contract ||
        contract.packageSubmissions.length === 0
    ) {
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
    }
    const isCMSUser = loggedInUser?.role === 'CMS_USER'
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const submissionStatus = contract.status
    const statePrograms = contract.state.programs

    const contractFormData = getVisibleLatestContractFormData(contract, isStateUser)
    if (!contractFormData || !contract || !statePrograms) {
        console.error('missing fundamental contract data inside submission summary')
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

    return (
        <div className={styles.background}>
           <div style={{ textAlign: 'center' }}>
                This is the V2 page of the SubmissionSummary
            </div>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {submissionStatus === 'UNLOCKED' && updateInfo && (
                    <SubmissionUnlockedBanner
                        userType={
                            loggedInUser?.role === 'CMS_USER'
                                ? 'CMS_USER'
                                : 'STATE_USER'
                        }
                        unlockedBy={updateInfo.updatedBy}
                        unlockedOn={updateInfo.updatedAt}
                        reason={updateInfo.updatedReason}
                        className={styles.banner}
                    />
                )}

                {submissionStatus === 'RESUBMITTED' && updateInfo && (
                    <SubmissionUpdatedBanner
                        submittedBy={updateInfo.updatedBy}
                        updatedOn={updateInfo.updatedAt}
                        changesMade={updateInfo.updatedReason}
                        className={styles.banner}
                    />
                )}

                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}

                {!showQuestionResponse && (
                    <Link
                        asCustom={NavLink}
                        to={{
                            pathname: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        }}
                    >
                        <Icon.ArrowBack />
                        {loggedInUser?.__typename === 'StateUser' ? (
                            <span>&nbsp;Back to state dashboard</span>
                        ) : (
                            <span>&nbsp;Back to dashboard</span>
                        )}
                    </Link>
                )}

                {
                    <SubmissionTypeSummarySectionV2
                        subHeaderComponent={
                            isCMSUser ? (
                                <div className={styles.subHeader}>
                                    {contract.mccrsID && (
                                        <span className={styles.mccrsID}>
                                            MC-CRS record number:
                                            <Link
                                                href={`https://mccrs.abtsites.com/Home/Index/${contract.mccrsID}`}
                                                aria-label="MC-CRS system login"
                                            >
                                                {contract.mccrsID}
                                            </Link>
                                        </span>
                                    )}
                                    <Link
                                        href={`/submissions/${contract.id}/mccrs-record-number`}
                                        className={
                                            contract.mccrsID
                                                ? styles.editLink
                                                : ''
                                        }
                                        aria-label={editOrAddMCCRSID}
                                    >
                                        {editOrAddMCCRSID}
                                    </Link>
                                </div>
                            ) : undefined
                        }
                        contract={contract}
                        submissionName={name}
                        headerChildComponent={
                            isCMSUser ? (
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
                    />
                }

                {(
                    <ContractDetailsSummarySectionV2
                        contract={contract}
                        isCMSUser={isCMSUser}
                        submissionName={name}
                        onDocumentError={handleDocumentDownloadError}
                    />
                )}

                {isContractActionAndRateCertification && (
                        <RateDetailsSummarySectionV2
                            contract={contract}
                            submissionName={name}
                            isCMSUser={isCMSUser}
                            statePrograms={statePrograms}
                            onDocumentError={handleDocumentDownloadError}
                        />
                    )}

                {<ContactsSummarySection contract={contract} />}

                {<ChangeHistoryV2 contract={contract} />}
                {
                    <UnlockSubmitModalV2
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
