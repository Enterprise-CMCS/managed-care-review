import React, { useState, useRef } from 'react'
import {
    Button,
    ErrorMessage,
    FormGroup,
    Label,
    FileInput as ReactUSWDSFileInput,
} from '@trussworks/react-uswds'

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

type FileItem = {
    id: string
    name: string
    url?: string
    status: FileStatus
}
export const FileInput = ({
    id,
    name,
    error,
    uploadFilesApi,
    ...props
}: FileInputProps): React.ReactElement => {
    const [fileItems, setFileItems] = useState<FileItem[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const generateFileItems = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return
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

    const canSubmit = () =>
        fileItems.length > 0 &&
        fileItems.every((item) => item.status !== 'PENDING') &&
        fileItems.some(
            (item) =>
                item.status === 'UPLOAD_COMPLETE' ||
                item.status === 'SAVED_TO_SUBMISSION'
        )

    const asyncS3Upload = (items: FileItem[]) => {
        items.forEach((item) => {
            console.log('uploading', item.name)
            uploadFilesApi(true)
                .then(() => {
                    console.log('then')
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
                    console.log('done', item.name)
                })
        })
    }

    const handleDrop = (e: React.DragEvent): void => {
        console.log('onDrop')
        const items = generateFileItems(fileInputRef?.current?.files || null)
        if (items) {
            setFileItems((array) => [...array, ...items])
            asyncS3Upload(items)
        }
    }

    const handleChange = (e: React.ChangeEvent): void => {
        console.log('onChange')
        const items = generateFileItems(fileInputRef?.current?.files || null)
        if (items) {
            setFileItems((array) => [...array, ...items])
            asyncS3Upload(items)
        }
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
                <ul>
                    {fileItems.map((item) => (
                        <li key={item.id} id={item.id}>
                            {item.status === 'PENDING' ? 'pending' : item.name}
                        </li>
                    ))}
                </ul>
            )}
            <Button type="button" disabled={!canSubmit}>
                Continue
            </Button>
        </div>
    )
}
