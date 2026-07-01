import { GridContainer, ModalRef } from '@trussworks/react-uswds'
import React, { useRef, useState, useEffect } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'
import {
    DynamicStepIndicator,
    ActionButton,
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
import { useQuery } from '@apollo/client/react'
import { FetchContractDocument } from '../../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../../Errors/Error404Page'
import {
    PageBannerAlerts,
    ErrorOrLoadingPage,
} from '../../SharedSubmissionComponents'
import { usePage } from '../../../../contexts/PageContext'
import { activeFormPages } from '../../submissionUtils'
import { featureFlags } from '@mc-review/common-code'
import { RoutesRecord, RouteT } from '@mc-review/constants'
import { toGQLError } from '@mc-review/helpers'

export const ReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { updateActiveMainContent } = usePage()
    const { id } = useRouteParams()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const ldClient = useLDClient()

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )

    const chipSubmissionAutomation = ldClient?.variation(
        featureFlags.CHIP_SUBMISSION_AUTOMATION.flag,
        featureFlags.CHIP_SUBMISSION_AUTOMATION.defaultValue
    )

    const getPath = (route: RouteT) => {
        return generatePath(RoutesRecord[route], {
            id,
            contractSubmissionType: 'health-plan',
        })
    }

    const { data, loading, error } = useQuery(FetchContractDocument, {
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
        fetchPolicy: 'network-only',
    })

    const contract = data?.fetchContract.contract
    const activeMainContentId = 'reviewSubmitMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error || !contract) {
        //error handling for a state user that tries to access rates for a different state
        const gqlError = toGQLError(error)
        if (gqlError?.extensions.code === 'FORBIDDEN') {
            return <ErrorForbiddenPage errorMsg={gqlError.message} />
        } else if (gqlError?.extensions.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <ErrorOrLoadingPage state="GENERIC_ERROR" />
        }
    }

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const contractFormData = getVisibleLatestContractFormData(
        contract,
        isStateUser
    )
    if (!contractFormData) return <ErrorOrLoadingPage state="GENERIC_ERROR" />

    const isContractActionAndRateCertification =
        contractFormData.submissionType === 'CONTRACT_AND_RATES'

    const submissionName =
        packageName(
            contract.stateCode,
            contract.stateNumber,
            contractFormData.programIDs,
            statePrograms
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
                        chipSubmissionAutomation &&
                        contractFormData.populationCovered === 'CHIP'
                            ? contract.status === 'UNLOCKED'
                                ? 'RESUBMIT_CHIP_ONLY'
                                : 'SUBMIT_CHIP_ONLY'
                            : contract.status === 'UNLOCKED'
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
