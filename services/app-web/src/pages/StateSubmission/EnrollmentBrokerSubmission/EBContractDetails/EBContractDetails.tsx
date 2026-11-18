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

// Empty Contract details page for the Enrollment Broker submission form.
// TODO: add form fields come in a follow-up ticket.
export const EBContractDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // Pages before and after this one come from the EB form flow
    const { previousPath, nextPath, stepIndicatorProps } = useFormFlow(
        'SUBMISSIONS_CONTRACT_DETAILS'
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
            <FormContainer id="contractDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleContinue()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">EB Contract details</legend>
                        <p
                            className="margin-0"
                            data-testid="eb-submission-details-placeholder"
                        >
                            The Enrollment Broker contract details form is
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
