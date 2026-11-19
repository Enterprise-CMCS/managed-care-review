import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
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

// Empty Associated rate certifications page for the ILOS submission form.
// TODO: form fields come in a follow-up ticket.
export const ILOSAssociatedRateCertifications = (): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'associatedRateCertificationsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // Pages before and after this one come from the ILOS form flow
    const { previousPath, nextPath, stepIndicatorProps } = useFormFlow(
        'SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS'
    )

    const handleContinue = () => {
        if (nextPath) navigate(nextPath)
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator {...stepIndicatorProps} />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="associatedRateCertifications">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleContinue()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">
                            Associated rate certifications
                        </legend>
                        <p className="margin-0">
                            The ILOS associated rate certifications form is
                            coming soon.
                        </p>
                    </fieldset>
                    <PageActions
                        backOnClick={() => {
                            if (previousPath) navigate(previousPath)
                        }}
                        backOnClickUrl={previousPath}
                        continueOnClickUrl={nextPath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
