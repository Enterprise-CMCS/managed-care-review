import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GridContainer } from '@trussworks/react-uswds'
import {
    ActionButton,
    DynamicStepIndicator,
    FormNotificationContainer,
    PageActionsContainer,
} from '../../../../components'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useFormFlow } from '../../../../hooks'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from './ILOSReviewSubmit.module.scss'

// Empty Review and submit page for the ILOS submission form.
// TODO: summary sections and submit come in a follow-up ticket.
export const ILOSReviewSubmit = (): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'reviewSubmitPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // Previous page comes from the ILOS form flow
    const { previousPath, stepIndicatorProps } = useFormFlow(
        'SUBMISSIONS_REVIEW_SUBMIT'
    )

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator {...stepIndicatorProps} />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <GridContainer
                className={styles.reviewSectionWrapper}
                data-testid="ilos-review-submit"
            >
                <fieldset className="usa-fieldset">
                    <legend className="srOnly">Review and submit</legend>
                    <p className="margin-0">
                        The ILOS review and submit page is coming soon.
                    </p>
                </fieldset>
                <PageActionsContainer>
                    <ActionButton
                        type="button"
                        variant="outline"
                        link_url={previousPath}
                        parent_component_type="page body"
                        onClick={() => {
                            if (previousPath) navigate(previousPath)
                        }}
                    >
                        Back
                    </ActionButton>
                </PageActionsContainer>
            </GridContainer>
        </div>
    )
}
