import {
    GridContainer,
    ModalRef,
} from '@trussworks/react-uswds'
import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DynamicStepIndicator } from '../../../../../components'
import { PageActionsContainer } from '../../../PageActions'
import styles from '../../ReviewSubmit.module.scss'
import { ActionButton } from '../../../../../components/ActionButton'
import {
    useRouteParams,
    useStatePrograms,
} from '../../../../../hooks'
import { useLDClient } from 'launchdarkly-react-client-sdk'

import { RoutesRecord } from '../../../../../constants'
import { UnlockSubmitModal } from '../../../../../components/Modal/UnlockSubmitModal'
import { getVisibleLatestContractFormData } from '../../../../../gqlHelpers/contractsAndRates'
import { useAuth } from '../../../../../contexts/AuthContext'
import { RateDetailsSummarySection } from '../../RateDetailsSummarySection'
import { ContactsSummarySection } from '../../ContactsSummarySection'
import { ContractDetailsSummarySection } from '../../ContractDetailsSummarySection'
import { SubmissionTypeSummarySection } from '../../SubmissionTypeSummarySection'
import { useFetchContractQuery } from '../../../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../../../Errors/Error404Page'
import { GenericErrorPage } from '../../../../Errors/GenericErrorPage'
import { Loading, FormNotificationContainer } from '../../../../../components'
import { PageBannerAlerts } from '../../../PageBannerAlerts'
import { packageName } from '../../../../../common-code/healthPlanFormDataType'
import { usePage } from '../../../../../contexts/PageContext'
import { activeFormPages } from '../../../StateSubmissionForm'
import { featureFlags } from '../../../../../common-code/featureFlags'
import { ModalOpenButton } from '../../../../../components/Modal'

export const ReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
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

    useEffect(() => {
        updateHeading({
            customHeading: contract?.draftRevision?.contractName,
        })
    }, [contract, updateHeading])

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
        contract.draftRates && contract.draftRates.length > 0
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
        <>
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

                <PageActionsContainer
                    left={
                        <ActionButton
                            type="button"
                            variant="linkStyle"
                            link_url={RoutesRecord.DASHBOARD_SUBMISSIONS}
                            parent_component_type="page body"
                            onClick={() =>
                                navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                            }
                            disabled={isSubmitting}
                        >
                            Save as draft
                        </ActionButton>
                    }
                >
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
        </>
    )
}
