import React, { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
    ErrorMessage,
    FormGroup,
    Label,
    FileInput,
    FileInputRef,
} from '@trussworks/react-uswds'

import styles from './FileUpload.module.scss'

import { FileItemT } from './FileItem/FileItem'
import { FileItemsList } from './FileItemList/FileItemsList'

export type S3FileData = {
    key: string
    s3URL: string
}

export type FileUploadProps = {
    id: string
    name: string
    label: string
    error?: string
    hint?: React.ReactNode
    initialItems?: FileItemT[]
    isLabelVisible?: boolean
    uploadFile: (file: File) => Promise<S3FileData>
    scanFile?: (key: string) => Promise<void | Error> // optional function to be called after uploading (used for scanning)
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
    error,
    initialItems,
    isLabelVisible = true,
    uploadFile,
    scanFile,
    deleteFile,
    onLoadComplete,
    ...inputProps
}: FileUploadProps): React.ReactElement => {
    const [loadingStatus, setLoadingStatus] = useState<
        null | 'UPLOADING' | 'COMPLETE'
    >(null)
    const [fileItems, setFileItems] = useState<FileItemT[]>(initialItems || [])
    const fileInputRef = useRef<FileInputRef>(null) // reference to the HTML input which has files

    React.useEffect(() => {
        if (loadingStatus !== 'UPLOADING') {
            onLoadComplete({ files: fileItems })
        }
    }, [fileItems, loadingStatus, onLoadComplete])

    const isDuplicateItem = (
        existingList: FileItemT[],
        currentItem: FileItemT
    ) => Boolean(existingList.some((item) => item.name === currentItem.name))

    const isAcceptableFile = (file: File): boolean => {
        const acceptedTypes = inputProps?.accept?.split(',') || []
        if (acceptedTypes === []) return true

        return acceptedTypes.some(
            (fileType) =>
                file.name.indexOf(fileType) > 0 ||
                file.type.includes(fileType.replace(/\*/g, ''))
        )
    }

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
                if (
                    currentItem.key !== undefined &&
                    currentItem.file === undefined
                ) {
                    // we know S3 upload and scanning has succeeded successfully
                    newList.push({
                        ...currentItem,
                        status: 'UPLOAD_COMPLETE',
                    })
                } else {
                    newList.push({
                        // user did not complete S3 upload and scan, lets display the upload error which forces user  to retry or remove
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
            deleteFile(key).catch(() => console.log('Error deleting from s3'))

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
                                    key: data.key,
                                    s3URL: data.s3URL,
                                    // In general, we update the UI status for file items as uploads and scans to S3 complete
                                    // Files with duplicate name errors are exceptional. This error takes priority. Duplicate files are still uploaded to s3 silently and scanned but will only display their duplicate name error.
                                    status:
                                        item.status === 'DUPLICATE_NAME_ERROR'
                                            ? item.status
                                            : 'SCANNING',
                                } as FileItemT
                            } else {
                                return item
                            }
                        })
                    })
                    return data
                })
                .then(async (data) => {
                    if (scanFile && data) {
                        try {
                            await scanFile(data.key)
                            setFileItems((prevItems) => {
                                const newItems = [...prevItems]
                                return newItems.map((item) => {
                                    if (item.key === data.key) {
                                        return {
                                            ...item,
                                            file: undefined,
                                            status:
                                                item.status ===
                                                'DUPLICATE_NAME_ERROR'
                                                    ? item.status
                                                    : 'UPLOAD_COMPLETE',
                                        } as FileItemT
                                    } else {
                                        return item
                                    }
                                })
                            })
                            return
                        } catch (e) {
                            setFileItems((prevItems) => {
                                const newItems = [...prevItems]
                                return newItems.map((item) => {
                                    if (item.key === data.key) {
                                        return {
                                            ...item,
                                            S3URL: null,
                                            status: 'SCANNING_ERROR',
                                        } as FileItemT
                                    } else {
                                        return item
                                    }
                                })
                            })
                            // immediately delete this bad file
                            deleteFile(data.key).catch(() =>
                                console.log('Error deleting from s3')
                            )
                        }
                    }
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
        if (!item.file) {
            console.log('cannot retry, no file available')
            return
        }

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

    const addFilesAndUpdateList = (files: File[]) => {
        const items = generateFileItems(files) // UI data objects -  used to track file upload state in a list below the input

        setFileItems((array) => [...array, ...items])
        asyncS3Upload(files)

        // reset input immediately to prepare for next interaction
        fileInputRef.current?.clearFiles()
    }

    const handleOnDrop = (e: React.DragEvent): void => {
        e.preventDefault()
        e.stopPropagation()
        const files = Array.from(e.dataTransfer.files || []).filter(
            (file: File) => isAcceptableFile(file)
        )
        addFilesAndUpdateList(files)
    }

    const handleOnChange = (e: React.ChangeEvent): void => {
        const files = Array.from(fileInputRef.current?.input?.files || []) // Web API File objects
        addFilesAndUpdateList(files)
    }

    return (
        <FormGroup className="margin-top-0">
            <Label className={isLabelVisible ? '' : 'srOnly'} htmlFor={id}>
                {label}
            </Label>

            {error && <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage>}
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
                id={id}
                name={name}
                className={styles.fileInput}
                aria-describedby={`${id}-error ${id}-hint`}
                multiple
                onChange={handleOnChange}
                onDrop={handleOnDrop}
                accept={inputProps.accept}
                ref={fileInputRef}
            />
            <FileItemsList
                retryItem={retryFile}
                deleteItem={deleteItem}
                fileItems={fileItems}
            />
        </FormGroup>
    )
}
