import React from 'react'
import { FileInput, FileItem } from './FileInput'
import { Alert, Button } from '@trussworks/react-uswds'

export default {
    title: 'Sandbox/FileUpload',
    component: FileInput,
}
const uploadFiles = (success: boolean, timeout?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve()
            } else {
                reject(new Error('Error'))
            }
        }, timeout || 4000)
    })
}

const deleteFiles = (success: boolean, timeout?: number): Promise<void> => {
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
export const DemoDocumentUploadForm = (): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [hasValidFiles, setHasValidFiles] = React.useState(false)
    const [files, setFiles] = React.useState<FileItem[]>([])

    const onLoadComplete = ({
        isValid,
        files,
    }: {
        isValid: boolean
        files: FileItem[]
    }) => {
        console.log('isValid: ', isValid)
        console.log('files: ', files)
        setHasValidFiles(isValid)
        setFiles(files)
    }

    return (
        <div>
            {shouldValidate && !hasValidFiles && (
                <Alert
                    type="error"
                    heading="Oops! Something went wrong. Invalid files or no files"
                />
            )}
            <FileInput
                id="Default"
                name="Default Input"
                uploadFilesApi={uploadFiles}
                onLoadComplete={onLoadComplete}
            />
            <div style={{ marginBottom: '20px' }}>
                <Button
                    type="button"
                    secondary={files.length > 0 && !hasValidFiles}
                    disabled={files.length > 0 && !hasValidFiles}
                    onClick={() => {
                        console.log('Check validation and submit files:')
                        setShouldValidate(true)
                    }}
                >
                    Continue
                </Button>
            </div>
        </div>
    )
}
