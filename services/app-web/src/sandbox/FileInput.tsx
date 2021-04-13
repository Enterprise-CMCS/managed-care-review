import React, { useState, useRef, useEffect } from 'react'
import {
    ErrorMessage,
    FormGroup,
    Label,
    FileInput as ReactUSWDSFileInput,
} from '@trussworks/react-uswds'
import { FileItem } from './FileItem'

export const FileStatuses = [
    'PENDING',
    'UPLOAD_COMPLETE',
    'UPLOAD_ERROR',
    'SAVED_TO_SUBMISSION',
] as const
type FileStatus = typeof FileStatuses[number] // iterable union type

type FileInputProps = {
    id: string
    error?: string
    name: string
    uploadFilesApi: (
        success: boolean,
        timeout?: number | undefined
    ) => Promise<void>
    deleteFiles?: (
        success: boolean,
        timeout?: number | undefined
    ) => Promise<void>
    onLoadComplete: ({
        isValid,
        files,
    }: {
        isValid: boolean
        files: FileItem[]
    }) => void
} & JSX.IntrinsicElements['input']

export type FileItem = {
    id: string
    name: string
    url?: string
    status: FileStatus
}

/* 
mc-review FileInput. Async upload of files using uswds styles.

Question:
- what does the error state for s3 load failure look like. If theres an error do we allow user to remove from list?  
- what does error state for duplicate file (by name) look like?

Note:
- on delete failure (from s3) fails silently

Submit button behavior
- on load it is enabled
- when files are being uploaded it is disabled
- after its been clicked the first time, turns on validation and disables itself if no files exist or no uploaded files exist


TODO: Disallow file upload of the same name (maybe show some kind of alert)
TODO: Delete files from S3 on Cancel button click
TODO: Call deleteFiles on delete
TODO: Refactor FileItemList into separate component. Should be a sibling of FileInput.
TODO: Display documents that are already submitted, validations should still be accurate
TODO: Use promise.all to have a better onLoadComplete
TODO: Style fix and accessibility bugs 

Refactor plan 
Sibling - FileInput props - name,id,onChange
Sibling - FileItemList props - file, onDelete
Parent (DocumentUpload) - calls onLoad, onSave, when FileInput has onChange, tracks file states, merges file list coming from api and in state
*/
export const FileInput = ({
    id,
    name,
    error,
    uploadFilesApi,
    onLoadComplete,
    ...props
}: FileInputProps): React.ReactElement => {
    const [fileItems, setFileItems] = useState<FileItem[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const fileInputKey = useRef(Math.random())

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

        if (hasNoPendingFiles) {
            onLoadComplete({ isValid: hasValidFiles, files: fileItems })
        }
    }, [fileItems, onLoadComplete])

    const generateFileItems = (fileList: FileList) => {
        const fileItems: FileItem[] = []
        for (let i = 0; i < fileList?.length; i++) {
            fileItems.push({
                id: fileList[i].name,
                name: fileList[i].name,
                url: window.URL.createObjectURL(fileList[i]),
                status: 'PENDING',
            })
        }
        return fileItems
    }

    const deleteItem = (id: string) => {
        setFileItems((prevItems) => prevItems.filter((item) => item.id !== id))
        // also call deleteFilesApi
    }

    const asyncS3Upload = (items: FileItem[]) => {
        items.forEach((item) => {
            const timeout = Math.round(Math.random() * 4000 + 1000)
            uploadFilesApi(true, timeout)
                .then(() => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((current) => {
                            if (current.id === item.id) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_COMPLETE',
                                } as FileItem
                            } else {
                                return current
                            }
                        })
                    })
                })
                .catch((e) => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((i) => {
                            if (i.id === item.id) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_ERROR',
                                } as FileItem
                            } else {
                                return item
                            }
                        })
                    })
                })
                .finally(() => {
                    console.log('upload complete')
                })
        })
    }

    const handleDrop = (e: React.DragEvent): void => {
        if (!fileInputRef?.current?.files) return

        const items = generateFileItems(fileInputRef.current.files)
        fileInputKey.current = Math.random()
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)
    }

    const handleChange = (e: React.ChangeEvent): void => {
        if (!fileInputRef?.current?.files) return

        const items = generateFileItems(fileInputRef.current.files)
        fileInputKey.current = Math.random()
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)
    }

    return (
        <FormGroup>
            <Label htmlFor={id}>Input accepts any kind of image</Label>
            <span className="usa-hint" id={`${id}-hint`}>
                Select any type of image format
            </span>
            {error && <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage>}
            <ReactUSWDSFileInput
                key={fileInputKey.current}
                id={id}
                name={name}
                aria-describedby={`${id}-error ${id}-hint`}
                multiple
                onChange={handleChange}
                onDrop={handleDrop}
                inputRef={fileInputRef}
            />
            {fileItems && (
                <ul
                    style={{
                        listStyleType: 'none',
                        display: 'inline-block',
                        padding: 0,
                        margin: '0 0 -1px ',
                        width: '480px',
                    }}
                >
                    {fileItems.map((item) => (
                        <li
                            key={item.id}
                            id={item.id}
                            className="usa-file-input__preview"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                pointerEvents: 'all',
                            }}
                        >
                            <FileItem deleteItem={deleteItem} item={item} />
                        </li>
                    ))}
                </ul>
            )}
        </FormGroup>
    )
}
