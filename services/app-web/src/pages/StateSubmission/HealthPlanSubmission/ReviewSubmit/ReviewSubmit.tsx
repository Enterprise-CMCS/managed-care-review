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
import { AIValidationStatusCard } from './AIvalidationStatusCard'
import { getAIValidationDisplayState } from './aiValidationStatus'
import { mapAIValidationFindings } from './aiValidationFindings'
import { shouldTriggerAIValidation } from './shouldTriggerAIValidation'

export const ReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { updateActiveMainContent } = usePage()
    const { id } = useRouteParams()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const triggerAttemptedRef = useRef<Set<string>>(new Set())
    const [triggerValidation] = useTriggerValidationMutation()
    const ldClient = useLDClient()

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
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
    } = useValidationStatusQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
        fetchPolicy: 'network-only',
        pollInterval: 5000,
        skip: !id,
    })

    const validationStatus = validationData?.validationStatus
    const validationDisplayState = getAIValidationDisplayState({
        stage: validationStatus?.stage,
        isStale: validationStatus?.isStale,
        error: validationStatus?.error,
    })
    const showInitialValidationLoading =
        validationLoading && !validationStatus && !validationError
    const validationFindings = validationStatus?.results ?? []
    const validationFindingDisplayItems =
        mapAIValidationFindings(validationFindings)
    // Findings should only render for the current completed artifact set. If
    // the artifact is stale, we keep showing status-only messaging until the
    // refreshed validation run catches up.
    const showValidationFindings =
        validationStatus?.stage === 'complete' &&
        !validationStatus.isStale &&
        validationFindingDisplayItems.length > 0
    const validationBannerMode = showValidationFindings ? 'findings' : 'status'

    const contractReady = !loading && !error
    const validationReady = !validationLoading && !validationError
    const hasContractId = Boolean(id)
    const shouldTriggerValidation =
        hasContractId &&
        contractReady &&
        validationReady &&
        shouldTriggerAIValidation({ validationStatus })

    const validationTriggerKey = `${id ?? 'unknown'}::${
        validationStatus?.artifactVersion ?? 'no-artifact-version'
    }`

    const contract = data?.fetchContract.contract
    const activeMainContentId = 'reviewSubmitMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

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
                <section
                    className={styles.validationStatusSection}
                    aria-label="Document review status"
                >
                    <AIValidationStatusCard
                        mode={validationBannerMode}
                        findings={
                            showValidationFindings
                                ? validationFindingDisplayItems
                                : []
                        }
                        state={
                            showInitialValidationLoading
                                ? {
                                      title: 'Loading document review',
                                      message:
                                          'We are loading the latest document review results for this submission.',
                                      alertType: 'info',
                                      isPolling: true,
                                  }
                                : validationError
                                  ? {
                                        title: 'Document review unavailable',
                                        message:
                                            'We could not load document review results right now, but you can still continue reviewing your submission.',
                                        alertType: 'warning',
                                        isPolling: false,
                                    }
                                  : validationDisplayState
                        }
                    />
                </section>
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
