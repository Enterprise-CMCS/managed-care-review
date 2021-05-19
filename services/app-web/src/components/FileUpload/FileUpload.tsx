import React, { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
    ErrorMessage,
    FormGroup,
    Label,
    FileInput,
} from '@trussworks/react-uswds'

import { FileItemT } from './FileItem'
import { FileItemsList } from './FileItemsList'

export type S3FileData = {
    key: string
    s3URL: string
}
export type FileUploadProps = {
    id: string
    name: string
    label: string
    hint?: React.ReactNode
    initialItems?: FileItemT[]
    uploadFile: (file: File) => Promise<S3FileData>
    deleteFile: (key: string) => Promise<void>
    onLoadComplete: ({ files }: { files: FileItemT[] }) => void
} & JSX.IntrinsicElements['input']

/*  FileUpload handles async file upload to S3 and displays inline errors per file. 
    Tracks files as they are uploaded. Once files are no longer processing passes to parent with onLoadComplete.

    Note: This component uses a ref to access files in the input. It also clears its own value after each change.
    This is not standard behavior for an HTML input. However, rendering quickly allows us to take over handling of files
    for upload and display in our custom FileItemList.
*/

export const FileUpload = ({
    id,
    name,
    label,
    hint,
    initialItems,
    uploadFile,
    deleteFile,
    onLoadComplete,
    ...inputProps
}: FileUploadProps): React.ReactElement => {
    const [formError, setFormError] = useState<string | null>(null)
    const [loadingStatus, setLoadingStatus] = useState<
        null | 'UPLOADING' | 'COMPLETE'
    >(null)
    const [fileItems, setFileItems] = useState<FileItemT[]>(
        initialItems ? initialItems : []
    )
    const fileInputRef = useRef<HTMLInputElement>(null) // reference to the HTML input which has files
    const fileInputKey = useRef(uuidv4()) // use of randomized key forces re-render of file input, and empties content on change

    React.useEffect(() => {
        if (loadingStatus !== 'UPLOADING') {
            onLoadComplete({ files: fileItems })
        }
    }, [fileItems, loadingStatus, onLoadComplete])

    const isDuplicateItem = (
        existingList: FileItemT[],
        currentItem: FileItemT
    ) => Boolean(existingList.some((item) => item.name === currentItem.name))

    // Generate initial list of FileItem stored component state
    const generateFileItems = (files: File[]) => {
        const items: FileItemT[] = []
        for (let i = 0; i < files?.length; i++) {
            const newItem: FileItemT = {
                id: uuidv4(),
                name: files[i].name,
                file: files[i],
                key: undefined,
                s3URL: undefined,
                status: 'PENDING',
            }

            if (isDuplicateItem(fileItems, newItem)) {
                newItem.status = 'DUPLICATE_NAME_ERROR'
            }

            items.push(newItem)
        }

        return items
    }

    // Remove deleted file items and update all file statuses
    const refreshItems = (
        existingList: FileItemT[],
        deletedItem?: FileItemT
    ) => {
        const newList: FileItemT[] = []
        existingList.forEach((currentItem) => {
            if (deletedItem && currentItem.id === deletedItem.id) return null
            // Update formerly duplicate item status if a duplicate item has been deleted
            if (
                currentItem.status === 'DUPLICATE_NAME_ERROR' &&
                !isDuplicateItem(newList, currentItem)
            ) {
                if (currentItem.key !== undefined) {
                    // we know S3 succeeded
                    newList.push({
                        ...currentItem,
                        status: 'UPLOAD_COMPLETE',
                    })
                } else {
                    newList.push({
                        // user should retry S3 upload
                        ...currentItem,
                        status: 'UPLOAD_ERROR',
                    })
                }
            } else {
                newList.push(currentItem)
            }
        })
        return newList
    }

    const deleteItem = (deletedItem: FileItemT) => {
        const key = fileItems.find((item) => item.id === deletedItem.id)?.key
        if (key !== undefined)
            deleteFile(key).catch(() =>
                console.log('silent error deleting from s3')
            )

        setFileItems((prevItems) => {
            return refreshItems(prevItems, deletedItem)
        })
    }
    // Upload to S3 and update file items in component state with the async loading status
    // This includes moving from pending/loading UI to display success or errors
    const asyncS3Upload = (files: File[] | File) => {
        setLoadingStatus('UPLOADING')
        const upload = (file: File) => {
            uploadFile(file)
                .then((data) => {
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((item) => {
                            if (item.file && item.file === file) {
                                return {
                                    ...item,
                                    file: undefined,
                                    key: data.key,
                                    s3URL: data.s3URL,
                                    // In general we update the UI status for file items as uploads to S3 complete
                                    // However, files with duplicate name errors are an exception. They are uploaded to s3 silently and instead display their error.
                                    status:
                                        item.status === 'DUPLICATE_NAME_ERROR'
                                            ? item.status
                                            : 'UPLOAD_COMPLETE',
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
                            if (item.file === file) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_ERROR',
                                } as FileItemT
                            } else {
                                return item
                            }
                        })
                    })
                })
                .finally(() => {
                    setLoadingStatus('COMPLETE')
                })
        }

        if (!(files instanceof File)) {
            files.forEach((file) => {
                upload(file)
            })
        } else {
            upload(files as File)
        }
    }

    const retryFile = (item: FileItemT) => {
        if (!item.file) return

        setFileItems((prevItems) => {
            const newItems = [...prevItems]
            return newItems.map((i) => {
                if (item.file === i.file) {
                    return {
                        ...i,
                        status: 'PENDING',
                    } as FileItemT
                } else {
                    return i
                }
            })
        })

        asyncS3Upload(item.file)
    }

    const handleFileInputChangeOrDrop = (
        e: React.DragEvent | React.ChangeEvent
    ): void => {
        // return early to ensure we display errors when invalid files are dropped
        if (
            !fileInputRef?.current?.files ||
            fileInputRef?.current?.files.length === 0
        )
            return

        const files = Array.from(fileInputRef.current.files)
        const items = generateFileItems(files)

        // start upload and display pending files
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(files)

        // reset input
        fileInputKey.current = uuidv4()
        setFormError(null)
    }

    return (
        <FormGroup className="margin-top-0">
            <Label className="srOnly" htmlFor={id}>
                {label}
            </Label>
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
            <FileItemsList
                retryItem={retryFile}
                deleteItem={deleteItem}
                fileItems={fileItems}
            />
        </FormGroup>
    )
}
