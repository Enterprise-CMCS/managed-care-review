import { Alert } from '@trussworks/react-uswds'
import { useTealium } from '../../../hooks'
import { useEffect } from 'react'

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
        <Alert
            type="error"
            heading="Missing documents"
            headingLevel="h4"
            className="margin-bottom-2"
        >
            You must upload at least one document
        </Alert>
    ) : (
        <Alert
            type="error"
            heading="Remove files with errors"
            headingLevel="h4"
            className="margin-bottom-2"
        >
            You must remove all documents with error messages before continuing
        </Alert>
    )
}
