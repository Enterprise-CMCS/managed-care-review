import {
    GridContainer,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DynamicStepIndicator } from '../../../../../components'
import { PageActionsContainer } from '../../../PageActions'
import styles from '../../../ReviewSubmit/ReviewSubmit.module.scss'
import { ActionButton } from '../../../../../components/ActionButton'
import { useRouteParams, useStatePrograms } from '../../../../../hooks'
import {
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
} from '../../../../../constants'
import { UnlockSubmitModalV2 } from '../../../../../components/Modal/V2/UnlockSubmitModalV2'
import { getLatestContractFormData } from '../../../../../gqlHelpers/contractsAndRates'
import { useAuth } from '../../../../../contexts/AuthContext'
import { RateDetailsSummarySectionV2 } from './RateDetailsSummarySectionV2'
import { ContactsSummarySection } from './ContactsSummarySectionV2'
import { ContractDetailsSummarySectionV2 } from './ContractDetailsSummarySectionV2'
import { SubmissionTypeSummarySectionV2 } from './SubmissionTypeSummarySectionV2'
import { useFetchContractQuery } from '../../../../../gen/gqlClient'
import { ErrorForbiddenPage } from '../../../../Errors/ErrorForbiddenPage'
import { Error404 } from '../../../../Errors/Error404Page'
import { GenericErrorPage } from '../../../../Errors/GenericErrorPage'
import { Loading } from '../../../../../components'
import { PageBannerAlerts } from '../../../PageBannerAlerts'
import { packageName } from '../../../../../common-code/healthPlanFormDataType'
import { usePage } from '../../../../../contexts/PageContext'

export const ReviewSubmitV2 = (): React.ReactElement => {
    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const { id } = useRouteParams()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

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

    const contractFormData = getLatestContractFormData(contract)
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
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={STATE_SUBMISSION_FORM_ROUTES}
                    currentFormPage="SUBMISSIONS_REVIEW_SUBMIT"
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={contract.draftRevision?.unlockInfo}
                    showPageErrorMessage={false}
                />
            </div>
            <GridContainer className={styles.reviewSectionWrapper}>
                <div>This is the V2 version of the Review Submit Page</div>
                <SubmissionTypeSummarySectionV2
                    contract={contract}
                    submissionName={submissionName}
                    editNavigateTo="../type"
                    statePrograms={statePrograms}
                />
                <ContractDetailsSummarySectionV2
                    contract={contract}
                    editNavigateTo="../contract-details"
                    submissionName={submissionName}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySectionV2
                        contract={contract}
                        editNavigateTo="../rate-details"
                        submissionName={submissionName}
                        statePrograms={statePrograms}
                    />
                )}

                <ContactsSummarySection
                    contract={contract}
                    editNavigateTo="../contacts"
                />

                <PageActionsContainer
                    left={
                        <ActionButton
                            type="button"
                            variant="linkStyle"
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
                        onClick={() => navigate('../documents')}
                        disabled={isSubmitting}
                    >
                        Back
                    </ActionButton>
                    <ModalToggleButton
                        modalRef={modalRef}
                        className={styles.submitButton}
                        data-testid="form-submit"
                        opener
                    >
                        Submit
                    </ModalToggleButton>
                </PageActionsContainer>

                {/* if the session is expiring, close this modal so the countdown modal can appear */}
                <UnlockSubmitModalV2
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
