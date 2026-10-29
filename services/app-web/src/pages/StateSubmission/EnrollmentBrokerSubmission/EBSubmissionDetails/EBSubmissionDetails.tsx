import React, { useEffect } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import {
    EB_SUBMISSION_FORM_ROUTES,
    RoutesRecord,
} from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import {
    ErrorOrLoadingPage,
    PageBannerAlerts,
} from '../../SharedSubmissionComponents'
import { useCurrentRoute, useRouteParams } from '../../../../hooks'
import { useContractForm } from '../../../../hooks/useContractForm'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import { getSubmissionPath } from '../../../../routeHelpers'
import { CreateContractInput } from '../../../../gen/gqlClient'
import styles from '../../StateSubmissionForm.module.scss'

// TODO: replace with real form values when the Submission details form is built.
// createContract requires these fields, so the placeholder sends fixed values.
const PLACEHOLDER_CREATE_INPUT: CreateContractInput = {
    contractSubmissionType: 'ENROLLMENT_BROKER',
    submissionType: 'CONTRACT_ONLY',
    contractType: 'BASE',
    populationCovered: 'MEDICAID',
    programIDs: [],
    submissionDescription: 'Placeholder Enrollment Broker submission',
}

export const EBSubmissionDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const location = useLocation()
    const { id } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()
    const { createDraft, draftSubmission, interimState, showPageErrorMessage } =
        useContractForm(id)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isNewSubmission = matchPath(
        RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
        location.pathname
    )

    const activeMainContentId = 'submissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (interimState) {
        return <ErrorOrLoadingPage state={interimState} />
    }

    const handleContinue = async () => {
        // Existing draft: nothing to save yet, go straight to Contract details
        if (!isNewSubmission && id) {
            navigate(
                getSubmissionPath(
                    'SUBMISSIONS_CONTRACT_DETAILS',
                    'ENROLLMENT_BROKER',
                    id
                )
            )
            return
        }

        setIsSubmitting(true)
        const newDraft = await createDraft(PLACEHOLDER_CREATE_INPUT)

        if (newDraft instanceof Error) {
            // useContractForm sets showPageErrorMessage, which shows the error banner
            setIsSubmitting(false)
            console.info(
                'Log: creating new submission failed with server error',
                newDraft
            )
            return
        }

        navigate(
            getSubmissionPath(
                'SUBMISSIONS_CONTRACT_DETAILS',
                'ENROLLMENT_BROKER',
                newDraft.id
            )
        )
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EB_SUBMISSION_FORM_ROUTES}
                    currentFormPage={
                        currentRoute === 'SUBMISSIONS_NEW_SUBMISSION_FORM'
                            ? 'SUBMISSIONS_TYPE' // Map new submission route to first step
                            : currentRoute
                    }
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission?.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage}
                />
            </FormNotificationContainer>
            <FormContainer id="SubmissionDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => {
                        e.preventDefault()
                        void handleContinue()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Submission details</legend>
                        <p
                            className="margin-0"
                            data-testid="eb-submission-details-placeholder"
                        >
                            The Enrollment Broker submission form is coming
                            soon.
                        </p>
                    </fieldset>
                    <PageActions
                        pageVariant={isNewSubmission ? 'FIRST' : 'EDIT_FIRST'}
                        backOnClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                        backOnClickUrl={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        actionInProgress={isSubmitting}
                        continueOnClickUrl={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
