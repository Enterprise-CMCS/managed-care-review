import React, { useEffect } from 'react'
import { DocumentUpload } from './DocumentUpload'
import { Alert, Button, Form } from '@trussworks/react-uswds'
import { FileItemT, FileStatuses } from './FileItem'

export default {
    title: 'Sandbox/DocumentUpload',
    component: DocumentUpload,
}
const fakeApiRequest = (success: boolean): Promise<void> => {
    const timeout = Math.round(Math.random() * 4000 + 1000)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve()
            } else {
                reject(new Error('Error'))
            }
        }, timeout)
    })
}

/* 
    Document Upload Form will request existing submission documents from api, and track overall files list.

    TODO: request existing submission documents and pass down to DocumentUpload (to be merged with files dynamically added to input)
    TODO: Delete all files unattached to a submission from S3 on Cancel button click
*/

export const DemoDocumentUploadSuccess = (): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [hasValidFiles, setHasValidFiles] = React.useState(false)
    const [fileItems, setFileItems] = React.useState<FileItemT[]>([]) // eventually this will include files from api

    useEffect(() => {
        const hasNoPendingFiles: boolean = fileItems.every(
            (item) => item.status !== 'PENDING'
        )

        const hasValidFiles: boolean =
            fileItems.length > 0 &&
            hasNoPendingFiles &&
            fileItems.some(
                (item) =>
                    item.status === 'UPLOAD_COMPLETE' ||
                    item.status === 'SAVED_TO_SUBMISSION'
            )
        setHasValidFiles(hasValidFiles)
    }, [fileItems])

    const onLoadComplete = ({ files }: { files: FileItemT[] }) => {
        setFileItems(files)
    }

    return (
        <Form
            className="usa-form--large"
            onSubmit={(e) => {
                e.preventDefault()
                console.log('Check validation and submit files:')
                setShouldValidate(true)
            }}
        >
            <pre>FOR TESTING PURPOSE ONLY. In active development.</pre>
            {shouldValidate && !hasValidFiles && (
                <Alert
                    type="error"
                    heading="Oops! Something went wrong. Invalid files or no files"
                />
            )}
            <DocumentUpload
                id="Default"
                name="Default Input"
                uploadS3Files={() => fakeApiRequest(true)}
                deleteS3Files={() => fakeApiRequest(true)}
                onLoadComplete={onLoadComplete}
            />
            <div style={{ marginBottom: '20px' }}>
                <Button
                    type="submit"
                    secondary={shouldValidate && !hasValidFiles}
                    disabled={shouldValidate && !hasValidFiles}
                >
                    Continue
                </Button>
            </div>
        </Form>
    )
}

export const DemoDocumentUploadFailure = (): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [hasValidFiles, setHasValidFiles] = React.useState(false)
    const [fileItems, setFileItems] = React.useState<FileItemT[]>([]) // eventually this will include files from api

    useEffect(() => {
        const hasNoPendingFiles: boolean = fileItems.every(
            (item) => item.status !== 'PENDING'
        )

        const hasValidFiles: boolean =
            fileItems.length > 0 &&
            hasNoPendingFiles &&
            fileItems.some(
                (item) =>
                    item.status === 'UPLOAD_COMPLETE' ||
                    item.status === 'SAVED_TO_SUBMISSION'
            )
        setHasValidFiles(hasValidFiles)
    }, [fileItems])

    const onLoadComplete = ({ files }: { files: FileItemT[] }) => {
        setFileItems(files)
    }

    return (
        <Form
            className="usa-form--large"
            onSubmit={(e) => {
                e.preventDefault()
                console.log('Check validation and submit files:')
                setShouldValidate(true)
            }}
        >
            <pre>FOR TESTING PURPOSE ONLY. In active development.</pre>
            {shouldValidate && !hasValidFiles && (
                <Alert
                    type="error"
                    heading="Oops! Something went wrong. Invalid files or no files"
                />
            )}
            <DocumentUpload
                id="Default"
                name="Default Input"
                uploadS3Files={() => fakeApiRequest(false)}
                deleteS3Files={() => fakeApiRequest(true)}
                onLoadComplete={onLoadComplete}
            />
            <div style={{ marginBottom: '20px' }}>
                <Button
                    type="submit"
                    secondary={shouldValidate && !hasValidFiles}
                    disabled={fileItems.length > 0 && !hasValidFiles}
                >
                    Continue
                </Button>
            </div>
        </Form>
    )
}
