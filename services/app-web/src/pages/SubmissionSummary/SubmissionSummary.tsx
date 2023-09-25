import {
    GridContainer,
    Link,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useOutletContext } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import { packageName } from '../../common-code/healthPlanFormDataType'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
    SupportingDocumentsSummarySection,
} from '../../components/SubmissionSummarySection'
import {
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
    DocumentWarningBanner,
} from '../../components'
import { usePage } from '../../contexts/PageContext'
import { UpdateInformation } from '../../gen/gqlClient'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory/ChangeHistory'
import { UnlockSubmitModal } from '../../components/Modal/UnlockSubmitModal'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'

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
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)
    const [documentError, setDocumentError] = useState(false)

    useEffect(() => {
        updateHeading({ customHeading: pkgName })
    }, [pkgName, updateHeading])

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

    return (
        <div className={styles.background}>
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
                        {user?.__typename === 'StateUser' ? (
                            <span>&nbsp;Back to state dashboard</span>
                        ) : (
                            <span>&nbsp;Back to dashboard</span>
                        )}
                    </Link>
                )}

                <SubmissionTypeSummarySection
                    submission={packageData}
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
                <ContractDetailsSummarySection
                    documentDateLookupTable={documentDates}
                    submission={packageData}
                    isCMSUser={isCMSUser}
                    submissionName={name}
                    onDocumentError={handleDocumentDownloadError}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        documentDateLookupTable={documentDates}
                        submission={packageData}
                        submissionName={name}
                        isCMSUser={isCMSUser}
                        statePrograms={statePrograms}
                        onDocumentError={handleDocumentDownloadError}
                    />
                )}

                <ContactsSummarySection submission={packageData} />

                <SupportingDocumentsSummarySection
                    submission={packageData}
                    onDocumentError={handleDocumentDownloadError}
                />

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
