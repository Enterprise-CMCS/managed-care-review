import React, { useState, useRef } from 'react'
import {
    ErrorMessage,
    FormGroup,
    Label,
    FileInput,
} from '@trussworks/react-uswds'

import { FileItemT } from './FileItem'
import { FileItemsList } from './FileItemsList'

export type S3FileData = {
    url: string
    key: string
}
type FileUploadProps = {
    id: string
    name: string
    label: string
    hint?: React.ReactNode
    uploadFile: (file: File) => Promise<S3FileData>
    deleteFile: (key: string) => Promise<void>
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
    uploadFile,
    deleteFile,
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
                key: undefined,
                status: 'PENDING',
            })
        }
        return fileItems
    }

    const deleteItem = (id: string) => {
        const key = fileItems.find((item) => item.id === id)?.key
        setFileItems((prevItems) =>
            prevItems.filter((item) => item.key !== key)
        )
        if (key !== undefined)
            deleteFile(key).catch(() =>
                console.log('silent error deleting from s3')
            )
    }

    const asyncS3Upload = (files: FileList) => {
        setLoadingStatus('UPLOADING')
        Array.from(files).forEach((file) => {
            uploadFile(file)
                .then((data) => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((item) => {
                            if (item.id === file.name) {
                                return {
                                    ...item,
                                    url: data.url,
                                    key: data.key,
                                    status: 'UPLOAD_COMPLETE',
                                } as FileItemT
                            } else {
                                return item
                            }
                        })
                    })
                })
                .catch((e) => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((item) => {
                            if (item.id === file.name) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_ERROR',
                                } as FileItemT
                            } else {
                                return item
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
        const files = fileInputRef.current.files
        const items = generateFileItems(fileInputRef.current.files)

        setFileItems((array) => [...array, ...items])
        asyncS3Upload(files)

        // reset input
        fileInputKey.current = Math.random()
        setFormError(null)
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
