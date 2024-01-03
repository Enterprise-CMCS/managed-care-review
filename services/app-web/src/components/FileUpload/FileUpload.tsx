import React, { useState, useRef } from 'react'
import { usePrevious } from '../../hooks'
import { v4 as uuidv4 } from 'uuid'
import {
    FormGroup,
    Label,
    FileInput,
    FileInputRef,
} from '@trussworks/react-uswds'
import { PoliteErrorMessage } from '../'
import { recordJSException } from '../../otelHelpers'

import styles from './FileUpload.module.scss'

import { FileItemT } from './FileProcessor/FileProcessor'
import { FileItemsList } from './FileItemList/FileItemsList'
import { pluralize } from '../../common-code/formatters'

import { recordUserInputException } from '../../otelHelpers'
import { calculateSHA256 } from '../../common-code/sha/generateSha'
import { useAuth } from '../../contexts/AuthContext'

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
    allowMultipleUploads?: boolean
    uploadFile: (file: File) => Promise<S3FileData>
    scanFile?: (key: string) => Promise<void | Error> // optional function to be called after uploading (used for scanning)
    deleteFile: (key: string) => Promise<void>
    onFileItemsUpdate: ({ fileItems }: { fileItems: FileItemT[] }) => void
    innerInputRef?: (el: HTMLInputElement) => void
} & JSX.IntrinsicElements['input']

/*
    FileUpload handles async file upload to S3 and displays inline errors per file.
    Tracks files as they are uploaded. Once files are no longer processing passes data back up to parent with onFileItemsUpdate.

    For more detail on this component and the related sub-components see docs/technical-design/file-upload.md
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
    onFileItemsUpdate,
    allowMultipleUploads = true,
    innerInputRef,
    ...inputProps
}: FileUploadProps): React.ReactElement => {
    const [fileItems, setFileItems] = useState<FileItemT[]>(initialItems || [])
    const fileInputRef = useRef<FileInputRef>(null) // reference to the HTML input which has files
    const summaryRef = useRef<HTMLHeadingElement>(null) // reference to the heading that we will focus
    const previousFileItems = usePrevious(fileItems)
    const { checkAuth } = useAuth()
    const isRequired = inputProps['aria-required']
    const inputRequired = inputProps['aria-required'] || inputProps.required

    React.useEffect(() => {
        if (JSON.stringify(fileItems) !== JSON.stringify(previousFileItems)) {
            onFileItemsUpdate({ fileItems })
        }
    }, [fileItems, previousFileItems, onFileItemsUpdate])

    //Pass input ref to parent when innerInputRef prop exists.
    React.useEffect(() => {
        if (innerInputRef && fileInputRef?.current?.input) {
            innerInputRef(fileInputRef.current.input)
        }
    }, [fileInputRef, innerInputRef])

    const isDuplicateItem = (
        existingList: FileItemT[],
        currentItem: FileItemT
    ) => Boolean(existingList.some((item) => item.name === currentItem.name))

    const isAcceptableFile = (file: File): boolean => {
        const acceptedTypes = inputProps?.accept?.split(',') || []
        if (acceptedTypes.length === 0) return true
        const acceptedFile = acceptedTypes.some(
            (fileType) =>
                file.name.indexOf(fileType) > 0 ||
                file.type.includes(fileType.replace(/\*/g, ''))
        )

        if (!acceptedFile) {
            recordUserInputException(
                `FileUpload: File upload error. Error Message: File ${file.name} of type ${file.type} is not an accepted file type`
            )
        }

        return acceptedFile
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
            deleteFile(key).catch(() => console.info('Error deleting from s3'))

        setFileItems((prevItems) => {
            return refreshItems(prevItems, deletedItem)
        })

        if (summaryRef.current) {
            summaryRef.current.focus()
        }
    }
    // Upload to S3 and update file items in component state with the async loading status
    // This includes moving from pending/loading UI to display success or errors
    const handleS3Upload = (files: File[] | File) => {
        const asyncUploadAndScan = async (file: File) => {
            const sha = (await calculateSHA256(file)) || ''
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
                                    sha256: sha,
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
                                        if (
                                            item.status ===
                                            'DUPLICATE_NAME_ERROR'
                                        ) {
                                            const error = new Error(
                                                `DUPLICATE_NAME_ERROR: ${item.status}`
                                            )
                                            recordJSException(error)
                                        }
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
                                        const error = new Error(
                                            `SCANNING_ERROR: ${item}`
                                        )
                                        recordJSException(error)
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
                            deleteFile(data.key).catch(() => {
                                const error = new Error(
                                    'Error deleting from s3'
                                )
                                recordJSException(error)
                                console.info(error)
                            })
                        }
                    }
                })
                .catch(async (_e) => {
                    const error = new Error(
                        `UPLOAD_ERROR: ${JSON.stringify(
                            _e
                        )}. Files added: ${JSON.stringify(files)}`
                    )
                    recordJSException(error)
                    // file upload failing could be due to session timeout that did not hit the modal
                    // double check the user still has their session, if not logout to update the React state with their login status
                    await checkAuth()

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
        }

        if (!(files instanceof File)) {
            files.forEach((file) => {
                asyncUploadAndScan(file).catch((e) => console.error(e))
            })
        } else {
            asyncUploadAndScan(files).catch((e) => console.error(e))
        }
    }

    const retryFile = (item: FileItemT) => {
        if (!item.file) {
            console.info('cannot retry, no file available')
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

        handleS3Upload(item.file)
    }

    const addFilesAndUpdateList = (files: File[]) => {
        const items = generateFileItems(files) // UI data objects -  used to track file upload state in a list below the input
        !allowMultipleUploads &&
            fileItems.forEach((fileItem) => {
                if (fileItem.key !== undefined)
                    deleteFile(fileItem.key).catch(() =>
                        console.info('Error deleting from s3')
                    )
                setFileItems((prevItems) => {
                    return refreshItems(prevItems, fileItem)
                })
            })
        setFileItems((array) => [...array, ...items])
        handleS3Upload(files)

        // reset input immediately to prepare for next interaction
        fileInputRef.current?.clearFiles()

        // Clear the input's value to ensure that onChange is always triggered.
        // Otherwise Chrome doesn't fire an onChange event if the same file is selected twice in a row.
        if (fileInputRef.current?.input) {
            fileInputRef.current.input.value = ''
        }

        setTimeout(function () {
            if (summaryRef.current) {
                summaryRef.current.focus()
            }
        }, 200)
    }

    const handleOnDrop = (e: React.DragEvent): void => {
        e.preventDefault()
        e.stopPropagation()
        const files = Array.from(e.dataTransfer.files || []).filter(
            (file: File) => isAcceptableFile(file)
        )
        addFilesAndUpdateList(files)
    }

    const handleOnChange = (_e: React.ChangeEvent): void => {
        const files = Array.from(fileInputRef.current?.input?.files || []) // Web API File objects
        addFilesAndUpdateList(files)
    }
    const uploadedCount = fileItems.filter(
        (item) => item.status === 'UPLOAD_COMPLETE'
    ).length
    const errorCount = fileItems.filter(
        (item) =>
            item.status === 'UPLOAD_ERROR' ||
            item.status === 'SCANNING_ERROR' ||
            item.status === 'DUPLICATE_NAME_ERROR'
    ).length
    const pendingCount = fileItems.filter(
        (item) => item.status === 'PENDING' || item.status === 'SCANNING'
    ).length

    const summaryDetailText =
        fileItems.length > 0
            ? `(${uploadedCount} complete, ${errorCount} ${pluralize(
                  'error',
                  errorCount
              )}, ${pendingCount} pending)`
            : ''

    const summary = `${fileItems.length} ${pluralize(
        'file',
        fileItems.length
    )} added `

    return (
        <FormGroup className="margin-top-0">
            <Label className={isLabelVisible ? '' : 'srOnly'} htmlFor={id}>
                {label}
            </Label>
            <span className={styles.requiredOptionalText}>
                {isRequired ? 'Required' : 'Optional'}
            </span>

            <PoliteErrorMessage id={`${id}-error`}>{error}</PoliteErrorMessage>
            {hint && (
                <span
                    id={`${id}-hint`}
                    role="note"
                    aria-labelledby={id}
                    className={styles.fileInputHint}
                >
                    {hint}
                </span>
            )}

            <FileInput
                id={id}
                name={`${name}${inputRequired ? ' (required)' : ''}`}
                className={styles.fileInput}
                aria-describedby={`${id}-error ${id}-hint`}
                multiple={allowMultipleUploads}
                onChange={handleOnChange}
                onDrop={handleOnDrop}
                accept={inputProps.accept}
                ref={fileInputRef}
                aria-required={inputRequired}
                crossOrigin="anonymous"
            />
            <h5 tabIndex={-1} ref={summaryRef} className={styles.fileSummary}>
                {`${summary} ${summaryDetailText}`}
            </h5>
            <FileItemsList
                retryItem={retryFile}
                deleteItem={deleteItem}
                fileItems={fileItems}
            />
        </FormGroup>
    )
}
