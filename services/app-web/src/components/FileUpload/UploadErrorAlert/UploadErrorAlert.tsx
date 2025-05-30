import { useTealium } from '../../../hooks'
import { useEffect } from 'react'
import { AccessibleAlertBanner } from '../../Banner/AccessibleAlertBanner/AccessibleAlertBanner'

export const UploadErrorAlert = ({
    hasNoDocuments = false,
}: {
    hasNoDocuments?: boolean
}): JSX.Element => {
    const { logAlertImpressionEvent } = useTealium()

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message: hasNoDocuments
                ? 'You must upload at least one document'
                : 'You must remove all documents with error messages before continuing',
            type: 'error',
            extension: 'react-uswds',
        })
    }, [logAlertImpressionEvent, hasNoDocuments])

    return hasNoDocuments ? (
        <AccessibleAlertBanner
            role="alert"
            type="error"
            heading="Missing documents"
            headingLevel="h4"
            className="margin-bottom-2"
        >
            You must upload at least one document
        </AccessibleAlertBanner>
    ) : (
        <AccessibleAlertBanner
            role="alert"
            type="error"
            heading="Remove files with errors"
            headingLevel="h4"
            className="margin-bottom-2"
        >
            You must remove all documents with error messages before continuing
        </AccessibleAlertBanner>
    )
}
