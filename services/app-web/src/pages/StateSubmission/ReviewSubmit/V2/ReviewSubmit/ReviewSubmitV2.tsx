import {
    GridContainer,
    ModalRef,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import React, { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    DynamicStepIndicator,
    ErrorSummary,
    SectionCard,
} from '../../../../../components'
import { PageActionsContainer } from '../../../PageActions'
import styles from '../../../ReviewSubmit/ReviewSubmit.module.scss'
import { ActionButton } from '../../../../../components/ActionButton'
import { useStatePrograms } from '../../../../../hooks/useStatePrograms'
import { DocumentDateLookupTableType } from '../../../../../documentHelpers/makeDocumentDateLookupTable'
import {
    RouteT,
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
} from '../../../../../constants'
import { useAuth } from '../../../../../contexts/AuthContext'
import { Contract } from '../../../../../gen/gqlClient'
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

type RouteParams = {
    id: string
}
export const ReviewSubmitV2 = (): React.ReactElement => {

    const navigate = useNavigate()
    const modalRef = useRef<ModalRef>(null)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    // pull the programs off the user
    const statePrograms = useStatePrograms()
    const { loggedInUser } = useAuth()
    const { id } = useParams<keyof RouteParams>()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }

    
    const { data, loading, error } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
    })

    const contract = data?.fetchContract.contract
    // if (!contract) {
    //     throw new Error(
    //         'PROGRAMMING ERROR: Contract is not found'
    //     )
    // }
  
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

    const submissionName = 'hello'
    const documentDateLookupTable = {
        fakesha: 'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        previousSubmissionDate: '01/01/01'
    }
    const isContractActionAndRateCertification =
    contract.draftRates && contract.draftRates.length > 0
    return (
        <>
        <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={STATE_SUBMISSION_FORM_ROUTES}
                    currentFormPage="SUBMISSIONS_REVIEW_SUBMIT_V2"
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={
                        contract.draftRevision?.unlockInfo
                    }
                    showPageErrorMessage={false} // TODO FIGURE OUT ERROR BANNER FOR BOTH MULTI AND STANDALONE USE CASE
                />
            </div>
            <GridContainer className={styles.reviewSectionWrapper}>
                {/* <SubmissionTypeSummarySectionV2
                    contract={contract}
                    submissionName={submissionName}
                    editNavigateTo="../type"
                    statePrograms={statePrograms}
                />

                <ContractDetailsSummarySectionV2
                    contract={contract}
                    editNavigateTo="../contract-details"
                    submissionName={submissionName}
                    documentDateLookupTable={documentDateLookupTable}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySectionV2
                        contract={contract}
                        editNavigateTo="../rate-details"
                        submissionName={submissionName}
                        documentDateLookupTable={documentDateLookupTable}
                        statePrograms={statePrograms}
                    />
                )}

                <ContactsSummarySection
                    contract={contract}
                    editNavigateTo="../contacts"
                /> */}

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

                {/* // if the session is expiring, close this modal so the countdown modal can appear
                <UnlockSubmitModal
                    healthPlanPackage={draftSubmission}
                    submissionName={submissionName}
                    modalType={unlocked ? 'RESUBMIT' : 'SUBMIT'}
                    modalRef={modalRef}
                    setIsSubmitting={setIsSubmitting}
                /> */}
            </GridContainer>
        </>
    )
}
