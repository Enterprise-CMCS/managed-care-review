import React, { useState, useRef } from 'react'
import {
    ErrorMessage,
    FormGroup,
    Label,
    FileInput,
} from '@trussworks/react-uswds'
import { FileItemT } from './FileItem'
import { FileItemsList } from './FileItemsList'

type FileUploadProps = {
    id: string
    name: string
    label: string
    hint?: React.ReactNode
    uploadS3Files: () => Promise<void>
    deleteS3Files: () => Promise<void>
    onLoadComplete: ({ files }: { files: FileItemT[] }) => void
} & JSX.IntrinsicElements['input']

/*  FileUpload handles async file upload to S3 and displays inline errors per file. 
    Tracks files as they are uploaded. Once files are no longer processing passes to parent with onLoadComplete.

    Note: This component uses a ref to access files in the input. It also clears its own value after each change.
    This is not standard behavior for an HTML input. However, rendering quickly allows us to take over handling of files
    for upload and display in our custom FileItemList.


    TODO: Refactor asyncS3Upload to use Promise.all
    TODO: Disallow file upload of the same name
    TODO: Disallow files that are not doc file type
    TODO: Implement inline error handling (when a specific file item fails to upload)
    TODO: Style fix for many items in list or items have long document titles
    TODO: Check thoroughly for accessibility 
*/

export const FileUpload = ({
    id,
    name,
    label,
    hint,
    uploadS3Files,
    deleteS3Files,
    onLoadComplete,
    ...inputProps
}: FileUploadProps): React.ReactElement => {
    const [formError, setFormError] = useState<string | null>(null)
    const [loadingStatus, setLoadingStatus] = useState<
        null | 'UPLOADING' | 'COMPLETE'
    >(null)
    const [fileItems, setFileItems] = useState<FileItemT[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null) // reference to the HTML input which has files
    const fileInputKey = useRef(Math.random()) // use of randomized key forces re-render of file input, and empties content on change

    React.useEffect(() => {
        if (loadingStatus === 'COMPLETE') {
            onLoadComplete({ files: fileItems })
        }
    }, [fileItems, loadingStatus, onLoadComplete])

    const generateFileItems = (fileList: FileList) => {
        const fileItems: FileItemT[] = []
        for (let i = 0; i < fileList?.length; i++) {
            fileItems.push({
                id: fileList[i].name,
                name: fileList[i].name,
                url: undefined,
                status: 'PENDING',
            })
        }
        return fileItems
    }

    const deleteItem = (id: string) => {
        // setLoadingStatus(null)
        setFileItems((prevItems) => prevItems.filter((item) => item.id !== id))
        deleteS3Files().catch(() => console.log('error deleting from s3'))
    }

    const asyncS3Upload = (items: FileItemT[]) => {
        setLoadingStatus('UPLOADING')
        items.forEach((item) => {
            uploadS3Files()
                .then(() => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((current) => {
                            if (current.id === item.id) {
                                return {
                                    ...item,
                                    url: 'https://www.example.com',
                                    status: 'UPLOAD_COMPLETE',
                                } as FileItemT
                            } else {
                                return current
                            }
                        })
                    })
                })
                .catch((e) => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((current) => {
                            if (current.id === item.id) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_ERROR',
                                } as FileItemT
                            } else {
                                return current
                            }
                        })
                    })
                    setFormError(
                        'Some files have failed to upload, please retry.'
                    )
                })
                .finally(() => {
                    setLoadingStatus('COMPLETE')
                })
        })
    }

    const handleFileInputChangeOrDrop = (
        e: React.DragEvent | React.ChangeEvent
    ): void => {
        if (!fileInputRef?.current?.files) return
        setFormError(null)

        const items = generateFileItems(fileInputRef.current.files)
        fileInputKey.current = Math.random()
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)
    }

    return (
        <FormGroup>
            <Label htmlFor={id}>{label}</Label>
            {formError && (
                <ErrorMessage id={`${id}-error`}>{formError}</ErrorMessage>
            )}
            {hint && (
                <span
                    id={`${id}-hint`}
                    aria-labelledby={id}
                    className="usa-hint margin-top-1"
                >
                    {hint}
                </span>
            )}
            <FileInput
                key={fileInputKey.current}
                id={id}
                name={name}
                aria-describedby={`${id}-error ${id}-hint`}
                multiple
                onChange={handleFileInputChangeOrDrop}
                onDrop={handleFileInputChangeOrDrop}
                accept={inputProps.accept}
                inputRef={fileInputRef}
            />
            <FileItemsList deleteItem={deleteItem} fileItems={fileItems} />
        </FormGroup>
    )
}
