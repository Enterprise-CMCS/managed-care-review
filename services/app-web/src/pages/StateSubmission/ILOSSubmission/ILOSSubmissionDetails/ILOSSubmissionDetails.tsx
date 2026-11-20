import React, { useEffect, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import { RoutesRecord } from '@mc-review/constants'
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
import { useFormFlow, useRouteParams } from '../../../../hooks'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from '../../StateSubmissionForm.module.scss'
import { useContractForm } from '../../../../hooks/useContractForm'
import { CreateContractInput } from '@mc-review/helpers/build/gen/gqlClient'
import { getSubmissionPath } from '../../../../routeHelpers'

// TODO: replace with real form values when the Submission details form is built.
// createContract requires these fields, so the placeholder sends fixed values.
const PLACEHOLDER_CREATE_INPUT: CreateContractInput = {
    contractSubmissionType: 'ILOS',
    submissionType: 'CONTRACT_AND_RATES',
    contractType: 'BASE',
    programIDs: [],
    submissionDescription: 'Placeholder ILOS submission',
    ilosRateDateStart: '2025-01-01',
    ilosRateDateEnd: '2025-12-31',
    ilosDocuments: [
        {
            name: 'placeholder-ilos-report.pdf',
            s3URL: 's3://bucketname/key/placeholder-ilos-report.pdf',
            sha256: 'placeholder-sha256',
        },
    ],
}

// Placeholder for the first page of the ILOS actuarial report submission form.
export const ILOSSubmissionDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const location = useLocation()
    const { updateActiveMainContent } = usePage()
    const { id } = useRouteParams()
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

    // Step list and titles come from the ILOS form flow
    const { stepIndicatorProps } = useFormFlow('SUBMISSIONS_TYPE')

    const handleContinue = async () => {
        // Existing draft: nothing to save yet, go straight to the next page
        if (!isNewSubmission && id) {
            navigate(
                getSubmissionPath(
                    'SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS',
                    'ILOS',
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
                'SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS',
                'ILOS',
                newDraft.id
            )
        )
    }

    if (interimState) {
        return <ErrorOrLoadingPage state={interimState} />
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator {...stepIndicatorProps} />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission?.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage}
                />
            </FormNotificationContainer>
            <FormContainer id="ILOSActuarialReport">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => {
                        e.preventDefault()
                        void handleContinue()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">
                            ILOS actuarial report
                        </legend>
                        <p
                            className="margin-0"
                            data-testid="ilos-submission-details-placeholder"
                        >
                            The ILOS actuarial report form is coming soon.
                        </p>
                    </fieldset>
                    <PageActions
                        pageVariant={isNewSubmission ? 'FIRST' : 'EDIT_FIRST'}
                        backOnClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                        backOnClickUrl={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        actionInProgress={isSubmitting}
                        continueOnClickUrl={
                            RoutesRecord.SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS
                        }
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
