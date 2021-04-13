import React, { useState, useRef, useEffect } from 'react'
import {
    Button,
    ErrorMessage,
    FormGroup,
    Label,
    FileInput as ReactUSWDSFileInput,
} from '@trussworks/react-uswds'
import { FileItemPreview } from './FileItemPreview'

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
} & JSX.IntrinsicElements['input']

export type FileItem = {
    id: string
    name: string
    url?: string
    status: FileStatus
}

/* 
mc-review FileInput. Async upload of files using uswds styles.

TODO: Display pdf icon
TODO: call deleteFiles on delete
TODO: show Error alert when trying to continue and not files uplaoded
TODO: disallow file upload of the same name (maybe show some kind of alert)
*/
export const FileInput = ({
    id,
    name,
    error,
    uploadFilesApi,
    ...props
}: FileInputProps): React.ReactElement => {
    const [fileItems, setFileItems] = useState<FileItem[]>([])
    const [canSubmit, setCanSubmit] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const hasValidFiles: boolean =
            fileItems.length > 0 &&
            fileItems.every((item) => item.status !== 'PENDING') &&
            fileItems.some(
                (item) =>
                    item.status === 'UPLOAD_COMPLETE' ||
                    item.status === 'SAVED_TO_SUBMISSION'
            )

        setCanSubmit(hasValidFiles)
    }, [fileItems])

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
            uploadFilesApi(true)
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
        })
    }

    const handleDrop = (e: React.DragEvent): void => {
        if (!fileInputRef?.current?.files) return

        const items = generateFileItems(fileInputRef.current.files)
        fileInputRef.current.value = ''
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)
    }

    const handleChange = (e: React.ChangeEvent): void => {
        if (!fileInputRef?.current?.files) return

        const items = generateFileItems(fileInputRef.current.files)
        fileInputRef.current.value = ''
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)
    }

    return (
        <div>
            <FormGroup>
                <Label htmlFor={id}>Input accepts any kind of image</Label>
                <span className="usa-hint" id={`${id}-hint`}>
                    Select any type of image format
                </span>
                {error && (
                    <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage>
                )}
                <ReactUSWDSFileInput
                    id={id}
                    name={name}
                    aria-describedby={`${id}-error ${id}-hint`}
                    multiple
                    onChange={handleChange}
                    onDrop={handleDrop}
                    inputRef={fileInputRef}
                />
            </FormGroup>
            {fileItems && (
                <ul
                    style={{
                        listStyleType: 'none',
                        display: 'inline-block',
                        padding: 0,
                        margin: '0 0 -1px ',
                    }}
                >
                    {fileItems.map((item) => (
                        <li
                            key={item.id}
                            id={item.id}
                            className="usa-file-input__preview"
                        >
                            <FileItemPreview
                                deleteItem={deleteItem}
                                item={item}
                            />
                        </li>
                    ))}
                </ul>
            )}
            <div>
                <Button
                    type="button"
                    secondary={!canSubmit}
                    disabled={!canSubmit}
                    onClick={() =>
                        console.log('Continue with files:', fileItems)
                    }
                >
                    Continue
                </Button>
            </div>
        </div>
    )
}
