import React, { useEffect } from 'react'
import { useRouteParams } from '../../../../hooks'
import { generatePath, useNavigate } from 'react-router-dom'
import {
    ActionButton,
    SectionCard,
    PageActionsContainer,
} from '../../../../components'
import { Button, GridContainer } from '@trussworks/react-uswds'
import { RoutesRecord } from '@mc-review/constants'
import styles from './EQROReviewSubmit.module.scss'
import { usePage } from '../../../../contexts/PageContext'

export const EQROReviewSubmit = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()

    const contactsPagePath = generatePath(RoutesRecord.SUBMISSIONS_CONTACTS, {
        id,
        contractSubmissionType,
    })

    const activeMainContentId = 'reviewSubmitPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <GridContainer className={styles.reviewSectionWrapper}>
                <SectionCard>
                    <div>Review and submit placeholder</div>
                </SectionCard>

                <PageActionsContainer>
                    <ActionButton
                        type="button"
                        variant="outline"
                        link_url="../contacts"
                        parent_component_type="page body"
                        onClick={() => navigate(contactsPagePath)}
                        disabled={false}
                    >
                        Back
                    </ActionButton>
                    <Button
                        type="submit"
                        onClick={() => {
                            console.info('submit function placeholder')
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }}
                    >
                        Submit
                    </Button>
                </PageActionsContainer>
            </GridContainer>
        </div>
    )
}
