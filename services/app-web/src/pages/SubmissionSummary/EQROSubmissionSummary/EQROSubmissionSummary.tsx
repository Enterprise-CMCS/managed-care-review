import React, { useEffect, useMemo, useState } from 'react'
import { usePage } from '../../../contexts/PageContext'
import { GridContainer, Link } from '@trussworks/react-uswds'
import { generatePath, Navigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouteParams } from '../../../hooks'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useFetchContractWithQuestionsQuery } from '../../../gen/gqlClient'
import {
    DocumentWarningBanner,
    LinkWithLogging,
    Loading,
} from '../../../components'
import { ErrorForbiddenPage } from '../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../Errors/Error404Page'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { RoutesRecord } from '@mc-review/constants'
import {
    getVisibleLatestContractFormData,
    getVisibleLatestRateRevisions,
} from '@mc-review/submissions'
import { IncompleteSubmissionBanner } from '../../../components/Banner'
import styles from '../SubmissionSummary.module.scss'
import {
    ContactsSummarySection,
    EQROContractDetailsSummarySection,
    SubmissionTypeSummarySection,
} from '../../../components/SubmissionSummarySection'

export const EQROSubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading, updateActiveMainContent } = usePage()
    const [documentError, setDocumentError] = useState(false)
    const { loggedInUser } = useAuth()
    const { id, contractSubmissionType } = useRouteParams()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isHelpDeskUser = loggedInUser?.role === 'HELPDESK_USER'

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
            </GridContainer>
        </div>
    )
}
