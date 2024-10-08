import React from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { ExpandableText } from '../../ExpandableText'
import { UpdateInformation, User } from '../../../gen/gqlClient'
import { getUpdatedByDisplayName } from '../../../gqlHelpers/userHelpers'
import { formatBannerDate } from '../../../common-code/dateHelpers'

export type UpdatedProps = {
    loggedInUser?: User
    updateInfo?: UpdateInformation | null
}

export const SubmissionUpdatedBanner = ({
    className,
    updateInfo,
}: UpdatedProps & React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="info"
            heading="Submission updated"
            headingLevel="h4"
            validation={true}
            data-testid="updatedSubmissionBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Submitted by:&nbsp;</b>
                    {getUpdatedByDisplayName(updateInfo?.updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {formatBannerDate(updateInfo?.updatedAt)}
                </p>
                <ExpandableText>
                    <>
                        <b>Changes made:&nbsp;</b>
                        {updateInfo?.updatedReason ?? 'Not available'}
                    </>
                </ExpandableText>
            </div>
        </Alert>
    )
}
