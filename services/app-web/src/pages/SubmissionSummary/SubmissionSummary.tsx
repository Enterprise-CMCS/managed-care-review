import {
    Alert,
    GridContainer,
    Link,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useEffect, useState, useRef } from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import {
    packageName,
    HealthPlanFormDataType,
} from '../../common-code/healthPlanFormDataType'
import { makeDateTable } from '../../documentHelpers/makeDocumentDateLookupTable'
import { base64ToDomain } from '../../common-code/proto/healthPlanFormDataProto'
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
    SubmissionUpdatedBanner,
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import {
    useFetchHealthPlanPackageQuery,
    HealthPlanPackageStatus,
    UpdateInformation,
} from '../../gen/gqlClient'

import { Error404 } from '../Errors/Error404'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory/ChangeHistory'
import { UnlockModal } from './UnlockModal'
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

export const SubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { loggedInUser, isSessionExpiring } = useAuth()
    const { updateHeading } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const [pageLevelAlert, setPageLevelAlert] = useState<string | undefined>(
        undefined
    )

    // Api fetched data state
    const [packageData, setPackageData] = useState<
        HealthPlanFormDataType | undefined
    >(undefined)
    const [updateInfo, setUpdateInfo] = useState<UpdateInformation | null>(null)
    const [submissionStatus, setSubmissionStatus] =
        useState<HealthPlanPackageStatus | null>(null)

    // document date lookup state
    const [documentDates, setDocumentDates] = useState<
        DocumentDateLookupTable | undefined
    >({})

    const { loading, error, data } = useFetchHealthPlanPackageQuery({
        variables: {
            input: {
                pkgID: id,
            },
        },
    })

    const submissionAndRevisions = data?.fetchHealthPlanPackage.pkg

    const isCMSUser = loggedInUser?.role === 'CMS_USER'

    // Pull out the correct revision form api request, display errors for bad dad
    useEffect(() => {
        if (submissionAndRevisions) {
            const lookupTable = makeDateTable(submissionAndRevisions)
            setDocumentDates(lookupTable)
            // We ignore revisions currently being edited.
            // The summary page should only ever called on a package that has been submitted once
            const currentRevision = submissionAndRevisions.revisions.find(
                (rev) => {
                    // we want the most recent revision that has submission info.
                    return rev.node.submitInfo
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
                currentRevision.node.formDataProto
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

            const submissionStatus = submissionAndRevisions.status
            if (
                submissionStatus === 'UNLOCKED' ||
                submissionStatus === 'RESUBMITTED'
            ) {
                const updateInfo =
                    submissionStatus === 'UNLOCKED'
                        ? submissionAndRevisions.revisions.find(
                              (rev) => rev.node.unlockInfo
                          )?.node.unlockInfo
                        : currentRevision.node.submitInfo

                if (updateInfo) {
                    setSubmissionStatus(submissionStatus)
                    setUpdateInfo({
                        ...updateInfo,
                    })
                } else {
                    const info =
                        submissionStatus === 'UNLOCKED'
                            ? 'unlock information'
                            : 'resubmission information'
                    console.error(
                        `ERROR: Encountered error when fetching ${info}`,
                        submissionAndRevisions.revisions
                    )
                    setPageLevelAlert(
                        `Error fetching ${info}. Please try again.`
                    )
                }
            }

            setPackageData(submissionResult)
        }
    }, [submissionAndRevisions, setPackageData, setPageLevelAlert])

    // Update header with submission name
    useEffect(() => {
        const subWithRevisions = data?.fetchHealthPlanPackage.pkg
        if (packageData && subWithRevisions) {
            const programs = subWithRevisions.state.programs
            updateHeading(pathname, packageName(packageData, programs))
        }
    }, [updateHeading, pathname, packageData, data])

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

    const statePrograms = submissionAndRevisions.state.programs

    const disableUnlockButton = ['DRAFT', 'UNLOCKED'].includes(
        submissionAndRevisions.status
    )

    const isContractActionAndRateCertification =
        packageData.submissionType === 'CONTRACT_AND_RATES'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {pageLevelAlert && (
                    <Alert
                        type="error"
                        heading="Unlock Error"
                        className={styles.banner}
                    >
                        {pageLevelAlert}
                    </Alert>
                )}

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
                    submission={packageData}
                    submissionName={packageName(packageData, statePrograms)}
                    headerChildComponent={
                        isCMSUser ? (
                            <UnlockModalButton
                                modalRef={modalRef}
                                disabled={disableUnlockButton}
                            />
                        ) : undefined
                    }
                    statePrograms={statePrograms}
                    initiallySubmittedAt={
                        submissionAndRevisions.initiallySubmittedAt
                    }
                />
                <ContractDetailsSummarySection
                    submission={packageData}
                    documentDateLookupTable={documentDates}
                    isCMSUser={isCMSUser}
                    submissionName={packageName(packageData, statePrograms)}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        submission={packageData}
                        submissionName={packageName(packageData, statePrograms)}
                        documentDateLookupTable={documentDates}
                        isCMSUser={isCMSUser}
                    />
                )}

                <ContactsSummarySection submission={packageData} />

                <SupportingDocumentsSummarySection submission={packageData} />

                <ChangeHistory submission={submissionAndRevisions} />
                {!isSessionExpiring && (
                    <UnlockModal
                        modalRef={modalRef}
                        healthPlanPackage={submissionAndRevisions}
                    />
                )}
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
