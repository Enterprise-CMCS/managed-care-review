import { GridContainer, ModalRef } from '@trussworks/react-uswds'
import React, { useRef, useState, useEffect } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'
import {
    DynamicStepIndicator,
    ActionButton,
    Loading,
    FormNotificationContainer,
    PageActionsContainer,
} from '../../../../components'
import styles from './ReviewSubmit.module.scss'
import { useRouteParams, useStatePrograms } from '../../../../hooks'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import {
    UnlockSubmitModal,
    ModalOpenButton,
} from '../../../../components/Modal'
import {
    getVisibleLatestContractFormData,
    packageName,
} from '@mc-review/submissions'
import { useAuth } from '../../../../contexts/AuthContext'
import {
    RateDetailsSummarySection,
    ContactsSummarySection,
    ContractDetailsSummarySection,
    SubmissionTypeSummarySection,
} from '../../../../components/SubmissionSummarySection'
import {
    useFetchContractQuery,
    useTriggerValidationMutation,
    useValidationStatusQuery,
} from '../../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../../Errors/Error404Page'
import { GenericErrorPage } from '../../../Errors/GenericErrorPage'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { usePage } from '../../../../contexts/PageContext'
import { activeFormPages } from '../../submissionUtils'
import { featureFlags } from '@mc-review/common-code'
import { RoutesRecord, RouteT } from '@mc-review/constants'
import {
    AIValidationStatusDetails,
    AIValidationStatusHeader,
} from './AIvalidationStatusCard'
import type { AIValidationCoverageSummary } from './aiValidationCoverage'
import { getAIValidationDisplayState } from './aiValidationStatus'
import { mapAIValidationFindings } from './aiValidationFindings'
import { shouldTriggerAIValidation } from '../aiValidation/shouldTriggerAIValidation'

const VALIDATION_POLL_INTERVAL_MS = 5000
const VALIDATION_TIMEOUT_MS = 90_000

export const ReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { updateActiveMainContent } = usePage()
    const { id } = useRouteParams()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [validationTimedOut, setValidationTimedOut] = useState<boolean>(false)
    const triggerAttemptedRef = useRef<Set<string>>(new Set())
    const [triggerValidation] = useTriggerValidationMutation()
    const ldClient = useLDClient()

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )
    const aiValidationEnabled = ldClient?.variation(
        featureFlags.AI_VALIDATION.flag,
        featureFlags.AI_VALIDATION.defaultValue
    )

    const getPath = (route: RouteT) => {
        return generatePath(RoutesRecord[route], {
            id,
            contractSubmissionType: 'health-plan',
        })
    }

    const { data, loading, error } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
        fetchPolicy: 'network-only',
    })

    // Validation status is informational on this page. It should keep polling in
    // the background without blocking the user’s review-and-submit flow.
    const {
        data: validationData,
        loading: validationLoading,
        error: validationError,
        startPolling,
        stopPolling,
    } = useValidationStatusQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
        fetchPolicy: 'network-only',
        skip: !id || !aiValidationEnabled,
    })

    const validationStatus = validationData?.validationStatus
    const validationCoverageSummary = validationStatus?.coverageSummary
    const validationDisplayCoverageSummary: AIValidationCoverageSummary | null =
        validationStatus?.stage === 'complete' ||
        validationStatus?.stage === 'failed'
            ? (validationCoverageSummary ?? null)
            : null
    const showInitialValidationLoading =
        validationLoading && !validationStatus && !validationError
    const validationFindings = validationStatus?.results ?? []
    const validationFindingDisplayItems =
        mapAIValidationFindings(validationFindings)
    const hasMismatchFindings = validationFindings.some(
        (finding) => finding.outcome === 'mismatch'
    )
    // Findings should only render for the current completed artifact set. If
    // the artifact is stale, we keep showing status-only messaging until the
    // refreshed validation run catches up.
    const showValidationFindings =
        validationStatus?.stage === 'complete' &&
        !validationStatus.isStale &&
        validationFindingDisplayItems.length > 0

    const contractReady = !loading && !error
    const validationReady = !validationLoading && !validationError
    const hasContractId = Boolean(id)
    const shouldTriggerValidation =
        aiValidationEnabled &&
        hasContractId &&
        contractReady &&
        validationReady &&
        shouldTriggerAIValidation({ validationStatus })

    const validationTriggerKey = `${id ?? 'unknown'}::${
        validationStatus?.artifactVersion ?? 'no-artifact-version'
    }`
    const validationBaseDisplayState = getAIValidationDisplayState({
        stage: validationStatus?.stage,
        isStale: validationStatus?.isStale,
        error: validationStatus?.error,
    })
    const validationShouldPoll =
        aiValidationEnabled &&
        hasContractId &&
        (!validationStatus ||
            shouldTriggerValidation ||
            validationBaseDisplayState.isPolling)
    const validationDisplayState = getAIValidationDisplayState({
        stage: validationStatus?.stage,
        isStale: validationStatus?.isStale,
        error: validationStatus?.error,
        isPartialCoverage: validationDisplayCoverageSummary?.isPartial,
        hasTimedOut:
            validationTimedOut &&
            !showValidationFindings &&
            !validationError &&
            validationStatus?.stage !== 'complete' &&
            validationStatus?.stage !== 'failed',
    })
    const [validationFindingsExpanded, setValidationFindingsExpanded] =
        useState(false)

    const contract = data?.fetchContract.contract
    const activeMainContentId = 'reviewSubmitMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    useEffect(() => {
        // Reset the timeout whenever the current artifact changes so each new
        // validation attempt gets its own polling window.
        setValidationTimedOut(false)
    }, [validationTriggerKey])

    useEffect(() => {
        if (!showValidationFindings) {
            setValidationFindingsExpanded(false)
        }
    }, [showValidationFindings])

    useEffect(() => {
        if (!hasContractId) {
            stopPolling()
            return
        }

        if (!validationShouldPoll) {
            stopPolling()
            return
        }

        startPolling(VALIDATION_POLL_INTERVAL_MS)
        const timeoutId = window.setTimeout(() => {
            // Keep polling after the non-blocking timeout so the page can still
            // reconcile a completed backend run without requiring a refresh.
            setValidationTimedOut(true)
        }, VALIDATION_TIMEOUT_MS)

        return () => {
            window.clearTimeout(timeoutId)
            stopPolling()
        }
    }, [hasContractId, startPolling, stopPolling, validationShouldPoll])

    useEffect(() => {
        if (!shouldTriggerValidation || !id) {
            return
        }

        if (triggerAttemptedRef.current.has(validationTriggerKey)) {
            return
        }

        triggerAttemptedRef.current.add(validationTriggerKey)

        void triggerValidation({
            variables: {
                input: {
                    contractID: id,
                },
            },
        }).catch((triggerError) => {
            console.error(
                'Failed to trigger AI validation from ReviewSubmit',
                triggerError
            )
        })
    }, [id, shouldTriggerValidation, triggerValidation, validationTriggerKey])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !contract) {
        //error handling for a state user that tries to access rates for a different state
        if (error?.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN') {
            return (
                <ErrorForbiddenPage errorMsg={error.graphQLErrors[0].message} />
            )
        } else if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    }

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const contractFormData = getVisibleLatestContractFormData(
        contract,
        isStateUser
    )
    if (!contractFormData) return <GenericErrorPage />

    const isContractActionAndRateCertification =
        contractFormData.submissionType === 'CONTRACT_AND_RATES'
    const programIDs = contractFormData?.programIDs
    const programs = statePrograms.filter((program) =>
        programIDs?.includes(program.id)
    )

    const submissionName =
        packageName(
            contract.stateCode,
            contract.stateNumber,
            contractFormData.programIDs,
            programs
        ) || ''
    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={activeFormPages(
                        contractFormData,
                        hideSupportingDocs
                    )}
                    currentFormPage="SUBMISSIONS_REVIEW_SUBMIT"
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={contract.draftRevision?.unlockInfo}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <GridContainer className={styles.reviewSectionWrapper}>
                <SubmissionTypeSummarySection
                    contract={contract}
                    submissionName={submissionName}
                    editNavigateTo={getPath('SUBMISSIONS_TYPE')}
                    isStateUser={isStateUser}
                    explainMissingData
                />
                <ContractDetailsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    editNavigateTo={getPath('SUBMISSIONS_CONTRACT_DETAILS')}
                    explainMissingData
                    headerDetailComponent={
                        aiValidationEnabled ? (
                            <>
                                <AIValidationStatusHeader
                                    summaryMessage={
                                        showInitialValidationLoading
                                            ? 'Loading the latest document review results.'
                                            : validationError
                                              ? 'We could not load document review results right now. You can continue reviewing and submit without these results.'
                                              : validationStatus?.stage ===
                                                      'complete' &&
                                                    !validationStatus.isStale
                                                ? hasMismatchFindings
                                                    ? 'A date mismatch was found in the reviewed documents.'
                                                    : 'No date mismatches were found in the reviewed documents.'
                                                : validationDisplayState.message
                                    }
                                    showDetailsToggle={
                                        showValidationFindings &&
                                        hasMismatchFindings
                                    }
                                    findingsExpanded={
                                        validationFindingsExpanded
                                    }
                                    onToggleFindings={() =>
                                        setValidationFindingsExpanded(
                                            (expanded) => !expanded
                                        )
                                    }
                                    state={
                                        showInitialValidationLoading
                                            ? {
                                                  title: 'Loading document review',
                                                  message:
                                                      'Loading the latest document review results.',
                                                  alertType: 'info',
                                                  isPolling: true,
                                              }
                                            : validationError
                                              ? {
                                                    title: 'Document review unavailable',
                                                    message:
                                                        'We could not load document review results right now. You can continue reviewing and submit without these results.',
                                                    alertType: 'warning',
                                                    isPolling: false,
                                                }
                                              : validationDisplayState
                                    }
                                />
                                {validationFindingsExpanded &&
                                    showValidationFindings &&
                                    hasMismatchFindings && (
                                        <AIValidationStatusDetails
                                            findings={
                                                validationFindingDisplayItems
                                            }
                                        />
                                    )}
                            </>
                        ) : undefined
                    }
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        contract={contract}
                        editNavigateTo={getPath('SUBMISSIONS_RATE_DETAILS')}
                        submissionName={submissionName}
                        statePrograms={statePrograms}
                        explainMissingData
                    />
                )}

                <ContactsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    editNavigateTo={getPath('SUBMISSIONS_CONTACTS')}
                    explainMissingData
                />

                <PageActionsContainer>
                    <ActionButton
                        type="button"
                        variant="outline"
                        link_url={getPath('SUBMISSIONS_CONTACTS')}
                        parent_component_type="page body"
                        onClick={() =>
                            navigate(getPath('SUBMISSIONS_CONTACTS'))
                        }
                        disabled={isSubmitting}
                    >
                        Back
                    </ActionButton>
                    <ModalOpenButton
                        modalRef={modalRef}
                        className={styles.submitButton}
                        id="form-submit"
                    >
                        Submit
                    </ModalOpenButton>
                </PageActionsContainer>

                <UnlockSubmitModal
                    submissionData={contract}
                    submissionName={submissionName}
                    modalType={
                        contract.status === 'UNLOCKED'
                            ? 'RESUBMIT_CONTRACT'
                            : 'SUBMIT_CONTRACT'
                    }
                    modalRef={modalRef}
                    setIsSubmitting={setIsSubmitting}
                />
            </GridContainer>
        </div>
    )
}
