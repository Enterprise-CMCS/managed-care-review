import { GridContainer, ModalRef } from '@trussworks/react-uswds'
import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    DynamicStepIndicator,
    ActionButton,
    Loading,
    FormNotificationContainer,
} from '../../../../components'
import { PageActionsContainer } from '../PageActions'
import styles from './ReviewSubmit.module.scss'
import { useRouteParams, useStatePrograms } from '../../../../hooks'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { UnlockSubmitModal, ModalOpenButton } from '../../../../components/Modal'
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
import { useFetchContractQuery } from '../../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../../Errors/Error404Page'
import { GenericErrorPage } from '../../../Errors/GenericErrorPage'
import { PageBannerAlerts } from '../../PageBannerAlerts'
import { usePage } from '../../../../contexts/PageContext'
import { activeFormPages } from '../StateSubmissionForm'
import { featureFlags } from '@mc-review/common-code'

export const ReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { updateHeading, updateActiveMainContent } = usePage()
    const { id } = useRouteParams()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const ldClient = useLDClient()

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )

    const { data, loading, error } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
        fetchPolicy: 'network-only',
    })

    const contract = data?.fetchContract.contract
    const activeMainContentId = 'reviewSubmitMainContent'

    useEffect(() => {
        updateHeading({
            customHeading: contract?.draftRevision?.contractName,
        })
    }, [contract, updateHeading])

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
                    editNavigateTo="../type"
                    statePrograms={statePrograms}
                    isStateUser={isStateUser}
                    explainMissingData
                />
                <ContractDetailsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    editNavigateTo="../contract-details"
                    submissionName={submissionName}
                    explainMissingData
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        contract={contract}
                        editNavigateTo="../rate-details"
                        submissionName={submissionName}
                        statePrograms={statePrograms}
                        explainMissingData
                    />
                )}

                <ContactsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    editNavigateTo="../contacts"
                    explainMissingData
                />

                <PageActionsContainer>
                    <ActionButton
                        type="button"
                        variant="outline"
                        link_url="../documents"
                        parent_component_type="page body"
                        onClick={() =>
                            navigate(
                                hideSupportingDocs
                                    ? '../contacts'
                                    : '../documents'
                            )
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
