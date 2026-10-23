import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import {
    ActionButton,
    FormContainer,
    PageActionsContainer,
} from '../../../../components'
import { usePage } from '../../../../contexts/PageContext'

// Placeholder for the first page of the Enrollment Broker submission form.
export const EBSubmissionDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const activeMainContentId = 'ebSubmissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <FormContainer id="EBSubmissionDetails">
                <h2>Submission details</h2>
                <p data-testid="eb-submission-details-placeholder">
                    The Enrollment Broker submission form is coming soon.
                </p>
                <PageActionsContainer>
                    <ActionButton
                        type="button"
                        variant="outline"
                        link_url={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        parent_component_type="page body"
                        onClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                    >
                        Cancel
                    </ActionButton>
                </PageActionsContainer>
            </FormContainer>
        </div>
    )
}
