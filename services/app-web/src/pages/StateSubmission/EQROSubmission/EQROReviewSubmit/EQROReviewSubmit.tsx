import React, { useEffect, useRef, useState } from 'react'
import { useRouteParams, useCurrentRoute } from '../../../../hooks'
import { generatePath, useNavigate } from 'react-router-dom'
import {
    ActionButton,
    PageActionsContainer,
    DynamicStepIndicator,
    FormNotificationContainer,
    Loading,
} from '../../../../components'
import { GridContainer, ModalRef } from '@trussworks/react-uswds'
import {
    RoutesRecord,
    EQRO_SUBMISSION_FORM_ROUTES,
    RouteT,
} from '@mc-review/constants'
import styles from './EQROReviewSubmit.module.scss'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import { useQuery } from '@apollo/client/react'
import { FetchContractDocument } from '../../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../../Errors/Error404Page'
import { GenericErrorPage } from '../../../Errors/GenericErrorPage'
import {
    getVisibleLatestContractFormData,
    packageName,
} from '@mc-review/submissions'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { ContactsSummarySection } from '../../../../components/SubmissionSummarySection'
import { EQROSubmissionTypeSummarySection } from '../../../../components/SubmissionSummarySection'
import { EQROContractDetailsSummarySection } from '../../../../components/SubmissionSummarySection'
import {
    ModalOpenButton,
    UnlockSubmitModal,
} from '../../../../components/Modal'
import { toGQLError } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

export const EQROReviewSubmit = (): React.ReactElement => {
    const { id } = useRouteParams()
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const { loggedInUser } = useAuth()
    const modalRef = useRef<ModalRef>(null)
    const ldClient = useLDClient()

    const chipSubmissionAutomation = ldClient?.variation(
        featureFlags.CHIP_SUBMISSION_AUTOMATION.flag,
        featureFlags.CHIP_SUBMISSION_AUTOMATION.defaultValue
    )

    const getPath = (route: RouteT) => {
        return generatePath(RoutesRecord[route], {
            id,
            contractSubmissionType: 'eqro',
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
    const activeMainContentId = 'reviewSubmitPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !contract) {
        //error handling for a state user that tries to access rates for a different state
        const gqlError = toGQLError(error)
        if (gqlError?.extensions.code === 'FORBIDDEN') {
            return <ErrorForbiddenPage errorMsg={gqlError.message} />
        } else if (gqlError?.extensions.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (contract.contractSubmissionType !== 'EQRO') {
        return <GenericErrorPage />
    }

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const contractFormData = getVisibleLatestContractFormData(
        contract,
        isStateUser
    )

    if (!contractFormData) return <GenericErrorPage />

    const submissionName =
        packageName(
            contract.stateCode,
            contract.stateNumber,
            contractFormData.programIDs,
            contract.state.programs
        ) || ''

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={currentRoute}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={contract.draftRevision?.unlockInfo}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <GridContainer className={styles.reviewSectionWrapper}>
                <div role="note" className={styles.reviewInfoDisclaimer}>
                    The information you provide on this form determines whether
                    this submission is subject to formal CMS review and
                    approval.
                </div>
                <EQROSubmissionTypeSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    headerText={submissionName}
                    editNavigateTo={getPath('SUBMISSIONS_TYPE')}
                    explainMissingData
                />
                <EQROContractDetailsSummarySection
                    contract={contract}
                    editNavigateTo={getPath('SUBMISSIONS_CONTRACT_DETAILS')}
                    explainMissingData
                />
                <ContactsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    editNavigateTo={getPath('SUBMISSIONS_CONTACTS')}
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
                        id="eqro-review-submit-modal-open-button"
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
                              ? 'RESUBMIT_EQRO_CONTRACT'
                              : 'SUBMIT_EQRO_CONTRACT'
                    }
                    modalRef={modalRef}
                    setIsSubmitting={setIsSubmitting}
                />
            </GridContainer>
        </div>
    )
}
