import React from 'react'
import styles from '../Banner.module.scss'
import { LastUpdatedAnalystsType } from '../../../pages/Settings/Settings'
import { recordJSException } from '@mc-review/otel'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export const AssignedStaffUpdateBanner = ({
    className,
    state,
    removed,
    added,
}: LastUpdatedAnalystsType &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement | null => {
    if (!state || (!removed && !added)) {
        recordJSException(
            `AssignedStaffUpdate display not possible, bad data. State: ${state}, Added: ${added}, Removed: ${removed}`
        )
        return null
    }
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            heading={`${state}'s assigned staff has been updated`}
            headingLevel="h4"
            validation={true}
            data-testid="assignedStaffUpdate"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <span>
                    {' '}
                    The following changes have been made for {state} analysts:
                </span>
                <ul>
                    {removed &&
                        removed.map((person, indx) => (
                            <li key={`add-${indx}`}>{person} was removed</li>
                        ))}
                    {added &&
                        added.map((person, indx) => (
                            <li key={`remove-${indx}`}>
                                {person} was assigned to this state
                            </li>
                        ))}
                </ul>
            </div>
        </AccessibleAlertBanner>
    )
}
