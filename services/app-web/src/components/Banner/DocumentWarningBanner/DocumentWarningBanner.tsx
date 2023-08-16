import React from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { useStringConstants } from '../../../hooks/useStringConstants'
import classnames from 'classnames'

export const DocumentWarningBanner = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
    return (
        <Alert
            role="alert"
            type="warning"
            heading={`Document download unavailable`}
            headingLevel="h4"
            data-testid="warning-alert"
            className={classnames(styles.bannerBodyText, 'usa-alert__text')}
        >
            <span>
                Some documents aren’t available right now. Refresh the page to
                try again. If you still see this message,&nbsp;
            </span>
            <a
                href={`mailto: ${MAIL_TO_SUPPORT}, mc-review-team@truss.works`}
                className="usa-link"
                target="_blank"
                rel="noreferrer"
            >
                email the help desk.
            </a>
        </Alert>
    )
}
