import { Alert } from '@trussworks/react-uswds'

export const UploadErrorAlert = ({
    hasNoDocuments = false,
}: {
    hasNoDocuments?: boolean
}): JSX.Element =>
    hasNoDocuments ? (
        <Alert
            type="error"
            heading="Missing documents"
            className="margin-bottom-2"
        >
            You must upload at least one document
        </Alert>
    ) : (
        <Alert
            type="error"
            heading="Remove files with errors"
            className="margin-bottom-2"
        >
            You must remove all documents with error messages before continuing
        </Alert>
    )
