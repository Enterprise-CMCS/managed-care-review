import React, { useEffect } from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { ERROR_MESSAGES } from '../../../constants/errors'
import { useStringConstants } from '../../../hooks/useStringConstants'
import { LinkWithLogging } from '../../TealiumLogging/Link'
import { useTealium } from '../../../hooks'

export type GenericApiErrorProps = {
    heading?: string
    message?: string
    suggestion?: string
}

export const GenericApiErrorBanner = ({
    heading,
    message,
    suggestion,
}: GenericApiErrorProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const { logAlertImpressionEvent } = useTealium()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT

    // We only want to log this impression once
    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message:
                'Please refresh your browser and if you continue to experience an error let us know.',
            type: 'error',
            extension: 'react-uswds',
        })
    }, [])

    return (
        <Alert
            role="alert"
            type="error"
            heading={heading || 'System error'}
            headingLevel="h4"
            validation
            data-testid="error-alert"
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>{message || ERROR_MESSAGES.generic_error}</b>
                </p>
                <p className="usa-alert__text">
                    {suggestion ? (
                        <span>{suggestion} </span>
                    ) : (
                        <>
                            <span>
                                Please refresh your browser and if you continue
                                to experience an error,&nbsp;
                            </span>
                            <LinkWithLogging
                                href={`mailto: ${MAIL_TO_SUPPORT}, mc-review-team@truss.works`}
                                variant="unstyled"
                                target="_blank"
                                rel="noreferrer"
                            >
                                let us know.
                            </LinkWithLogging>
                        </>
                    )}
                </p>
            </div>
        </Alert>
    )
}
