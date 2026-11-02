import React, { useEffect } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import {
    ContractSubmissionTypeRecord,
    EB_SUBMISSION_FORM_ROUTES,
    RoutesRecord,
} from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useCurrentRoute, useRouteParams } from '../../../../hooks'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from '../../StateSubmissionForm.module.scss'

// Empty Contract details page for the Enrollment Broker submission form.
// Mirrors the EQROContractDetails layout; form fields come in a follow-up ticket.
export const EBContractDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const { id } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // getSubmissionPath expects the GraphQL ContractSubmissionType enum, which has no EB yet,
    // so build the path from the route record directly.
    const submissionDetailsPath = generatePath(RoutesRecord.SUBMISSIONS_TYPE, {
        contractSubmissionType: ContractSubmissionTypeRecord.ENROLLMENT_BROKER,
        id,
    })

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EB_SUBMISSION_FORM_ROUTES}
                    currentFormPage={currentRoute}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="contractDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => e.preventDefault()}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">EB Contract details</legend>
                    </fieldset>
                    <PageActions
                        backOnClick={() => navigate(submissionDetailsPath)}
                        backOnClickUrl={submissionDetailsPath}
                        // Empty page: nothing to save yet
                        disableContinue
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
