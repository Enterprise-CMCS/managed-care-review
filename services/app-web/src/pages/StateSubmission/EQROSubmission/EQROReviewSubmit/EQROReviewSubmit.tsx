import React from 'react'
import { useRouteParams } from '../../../../hooks'
import { generatePath, useNavigate } from 'react-router-dom'
import { ActionButton, SectionCard } from '../../../../components'
import { Button, GridContainer } from '@trussworks/react-uswds'
import { PageActionsContainer } from '../../PageActions'
import { RoutesRecord } from '@mc-review/constants'
import styles from './EQROReviewSubmit.module.scss'

export const EQROReviewSubmit = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const contactsPagePath = generatePath(RoutesRecord.SUBMISSIONS_CONTACTS, {
        id,
        contractSubmissionType,
    })

    return (
        <div>
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
