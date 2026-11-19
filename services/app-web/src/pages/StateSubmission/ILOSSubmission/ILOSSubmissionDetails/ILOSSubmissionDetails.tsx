import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import { RoutesRecord } from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useFormFlow } from '../../../../hooks'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from '../../StateSubmissionForm.module.scss'

// Placeholder for the first page of the ILOS actuarial report submission form.
export const ILOSSubmissionDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'submissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // Step list and titles come from the ILOS form flow
    const { stepIndicatorProps } = useFormFlow('SUBMISSIONS_TYPE')

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator {...stepIndicatorProps} />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="ILOSActuarialReport">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => e.preventDefault()}
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
                        pageVariant="FIRST"
                        backOnClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                        backOnClickUrl={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        // Placeholder: nothing to save yet
                        disableContinue
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
