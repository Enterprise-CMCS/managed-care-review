import {
    GridContainer,
    Link,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, NavLink, useParams } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import { packageName } from '../../common-code/healthPlanFormDataType'
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
import { UpdateInformation } from '../../gen/gqlClient'
import { Error404 } from '../Errors/Error404Page'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory/ChangeHistory'
import { UnlockSubmitModal } from '../../components/Modal/UnlockSubmitModal'
import { useFetchHealthPlanPackageWrapper } from '../../gqlHelpers'
import { recordJSException } from '../../otelHelpers'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import { ApolloError } from '@apollo/client'

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
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const navigate = useNavigate()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)
    useEffect(() => {
        updateHeading({ customHeading: pkgName })
    }, [pkgName, updateHeading])

    const { result: fetchResult } = useFetchHealthPlanPackageWrapper(id)

    const isCMSUser = loggedInUser?.role === 'CMS_USER'

    if (fetchResult.status === 'LOADING') {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (fetchResult.status === 'ERROR') {
        const err = fetchResult.error
        console.error('Error from API fetch', fetchResult.error)
        if (err instanceof ApolloError) {
            handleApolloError(err, true)
        } else {
            recordJSException(err)
        }
        return <GenericErrorPage /> // api failure or protobuf decode failure
    }

    const { data, formDatas, documentDates } = fetchResult
    const pkg = data.fetchHealthPlanPackage.pkg

    // fetchHPP returns null if no package is found with the given ID
    if (!pkg) {
        return <Error404 />
    }

    const submissionStatus = pkg.status
    const statePrograms = pkg.state.programs

    // CMS Users can't see DRAFT, it's an error
    if (submissionStatus === 'DRAFT' && isCMSUser) {
        return <GenericErrorPage />
    }

    // State users should not see the submission summary page for DRAFT or UNLOCKED, it should redirect them to the edit flow.
    if (
        !isCMSUser &&
        (submissionStatus === 'DRAFT' || submissionStatus === 'UNLOCKED')
    ) {
        navigate(`/submissions/${id}/edit/type`)
    }

    // Current Revision is the last SUBMITTED revision, SubmissionSummary doesn't display data that is currently being edited
    // Since we've already bounced on DRAFT packages, this _should_ exist.
    const edge = pkg.revisions.find((rEdge) => rEdge.node.submitInfo)
    if (!edge) {
        const errMsg = `No currently submitted revision for this package: ${pkg.id}, programming error. `
        recordJSException(errMsg)
        return <GenericErrorPage />
    }
    const currentRevision = edge.node
    const packageData = formDatas[currentRevision.id]

    // set the page heading
    const name = packageName(packageData, statePrograms)
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

    return (
        <div className={styles.background}>
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
                    {loggedInUser?.__typename === 'StateUser' ? (
                        <span>&nbsp;Back to state dashboard</span>
                    ) : (
                        <span>&nbsp;Back to dashboard</span>
                    )}
                </Link>

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
                    initiallySubmittedAt={pkg.initiallySubmittedAt}
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
                        statePrograms={statePrograms}
                    />
                )}

                <ContactsSummarySection submission={packageData} />

                <SupportingDocumentsSummarySection submission={packageData} />

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
