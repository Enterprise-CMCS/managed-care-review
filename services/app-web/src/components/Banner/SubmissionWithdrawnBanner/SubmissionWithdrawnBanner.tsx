import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate } from '@mc-review/dates'
import { ExpandableText } from '../../ExpandableText'
import { UpdateInformation } from '../../../gen/gqlClient'

interface SubmissionWithdrawnBannerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    updateInfo: UpdateInformation
}

export const SubmissionWithdrawnBanner = ({
    className,
    updateInfo,
}: SubmissionWithdrawnBannerProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="success"
            heading="Status Updated"
            headingLevel="h4"
            validation={true}
            data-testid="withdrawnSubmissionBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Status:&nbsp;</b>Withdrawn
                </p>
                <p className="usa-alert__text">
                    <b>Updated by:&nbsp;</b>
                    {getUpdatedByDisplayName(updateInfo.updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {formatBannerDate(updateInfo.updatedAt)}
                </p>
                <ExpandableText>
                    <b>Reason for withdrawing the submission:&nbsp;</b>
                    {updateInfo.updatedReason}
                </ExpandableText>
            </div>
        </Alert>
    )
}
