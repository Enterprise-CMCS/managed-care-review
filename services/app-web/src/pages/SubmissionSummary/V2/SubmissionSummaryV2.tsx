import {
    GridContainer,
    Icon,
    Link,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useOutletContext } from 'react-router-dom'
import { packageName } from '../../../common-code/healthPlanFormDataType'
import { ContactsSummarySection } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContactsSummarySectionV2'
import { RateDetailsSummarySectionV2 } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/RateDetailsSummarySectionV2'
import { SubmissionTypeSummarySectionV2 } from '../../StateSubmission/ReviewSubmit/V2/ReviewSubmit/SubmissionTypeSummarySectionV2'
import {
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
    DocumentWarningBanner,
} from '../../../components'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../../StateSubmission/ErrorOrLoadingPage'
import { ContractDetailsSummarySectionV2 } from './ContractDetailsSummarySectionV2'
import { usePage } from '../../../contexts/PageContext'
import { UpdateInformation, useFetchContractQuery } from '../../../gen/gqlClient'
import styles from '../SubmissionSummary.module.scss'
import { ChangeHistory } from '../../../components/ChangeHistory/ChangeHistory'
import { UnlockSubmitModal } from '../../../components/Modal/UnlockSubmitModal'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import { SideNavOutletContextType } from '../../SubmissionSideNav/SubmissionSideNav'
import { RoutesRecord } from '../../../constants'
import { useRouteParams } from '../../../hooks'

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
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)
    const [documentError, setDocumentError] = useState(false)

    useEffect(() => {
        updateHeading({ customHeading: pkgName })
    }, [pkgName, updateHeading])
    const { id } = useRouteParams()

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
    })
    const ldClient = useLDClient()
    const showQuestionResponse = ldClient?.variation(
        featureFlags.CMS_QUESTIONS.flag,
        featureFlags.CMS_QUESTIONS.defaultValue
    )

    const { pkg, currentRevision, packageData, user, documentDates } =
        useOutletContext<SideNavOutletContextType>()

    const isCMSUser = user?.role === 'CMS_USER'
    const submissionStatus = pkg.status
    const statePrograms = pkg.state.programs

    // set the page heading
    const name = packageName(
        packageData.stateCode,
        packageData.stateNumber,
        packageData.programIDs,
        statePrograms
    )
    if (pkgName !== name) {
        setPkgName(name)
    }

    // Get the correct update info depending on the submission status
    let updateInfo: UpdateInformation | undefined = undefined
    if (submissionStatus === 'UNLOCKED' || submissionStatus === 'RESUBMITTED') {
        updateInfo =
            (submissionStatus === 'UNLOCKED'
                ? pkg.revisions.find((rev) => rev.node.unlockInfo)?.node
                      .unlockInfo
                : currentRevision.submitInfo) || undefined
    }

    const disableUnlockButton = ['DRAFT', 'UNLOCKED'].includes(pkg.status)

    const isContractActionAndRateCertification =
        packageData.submissionType === 'CONTRACT_AND_RATES'

    const handleDocumentDownloadError = (error: boolean) =>
        setDocumentError(error)

    const editOrAddMCCRSID = pkg.mccrsID
        ? 'Edit MC-CRS number'
        : 'Add MC-CRS record number'

    const contract = fetchContractData?.fetchContract.contract

     // Display any full page interim state resulting from the initial fetch API requests
     if (fetchContractLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (fetchContractError) {
        return (
            <ErrorOrLoadingPage state={handleAndReturnErrorState(fetchContractError)} />
        )
    }
    return (
        <div className={styles.background}>
            <div>This is the V2 page of the SubmissionSummary</div>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {submissionStatus === 'UNLOCKED' && updateInfo && (
                    <SubmissionUnlockedBanner
                        userType={
                            user?.role === 'CMS_USER'
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
                        {user?.__typename === 'StateUser' ? (
                            <span>&nbsp;Back to state dashboard</span>
                        ) : (
                            <span>&nbsp;Back to dashboard</span>
                        )}
                    </Link>
                )}

                {contract && (
                    <SubmissionTypeSummarySectionV2
                        subHeaderComponent={
                            isCMSUser ? (
                                <div className={styles.subHeader}>
                                    {pkg.mccrsID && (
                                        <span className={styles.mccrsID}>
                                            MC-CRS record number:
                                            <Link
                                                href={`https://mccrs.abtsites.com/Home/Index/${pkg.mccrsID}`}
                                                aria-label="MC-CRS system login"
                                            >
                                                {pkg.mccrsID}
                                            </Link>
                                        </span>
                                    )}
                                    <Link
                                        href={`/submissions/${pkg.id}/mccrs-record-number`}
                                        className={
                                            pkg.mccrsID ? styles.editLink : ''
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
                                    disabled={disableUnlockButton}
                                />
                            ) : undefined
                        }
                        statePrograms={statePrograms}
                        initiallySubmittedAt={pkg.initiallySubmittedAt}
                    />
                )}

                {contract && (
                    <ContractDetailsSummarySectionV2
                        documentDateLookupTable={documentDates}
                        contract={contract}
                        isCMSUser={isCMSUser}
                        submissionName={name}
                        onDocumentError={handleDocumentDownloadError}
                    />
                )}

                {contract && isContractActionAndRateCertification && (
                    <RateDetailsSummarySectionV2
                        documentDateLookupTable={documentDates}
                        contract={fetchContractData?.fetchContract.contract}
                        submissionName={name}
                        isCMSUser={isCMSUser}
                        statePrograms={statePrograms}
                        onDocumentError={handleDocumentDownloadError}
                    />
                )}

                {contract && (
                    <ContactsSummarySection contract={contract} />
                )}

                <ChangeHistory submission={pkg} />
                {
                    // if the session is expiring, close this modal so the countdown modal can appear
                    <UnlockSubmitModal
                        modalRef={modalRef}
                        modalType="UNLOCK"
                        healthPlanPackage={pkg}
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
