import React from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { dayjs } from '../../../dateHelpers'

export type UpdatedProps = {
    submittedBy: string
    updatedOn: Date
    changesMade: string
}

export const SubmissionUpdatedBanner = ({
    submittedBy,
    updatedOn,
    changesMade,
}: UpdatedProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="info"
            heading="Submission updated"
            validation={true}
            data-testid="updatedSubmissionBanner"
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Submitted by:&nbsp;</b>
                    {submittedBy}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {dayjs
                        .utc(updatedOn)
                        .tz('America/New_York')
                        .format('MM/DD/YY h:mma')}
                    &nbsp;ET
                </p>
                <p className="usa-alert__text">
                    <b>Changes made:&nbsp;</b>
                    {changesMade}
                </p>
            </div>
        </Alert>
    )
}
