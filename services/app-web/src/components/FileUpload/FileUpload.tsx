import React, { useState, useRef, type JSX } from 'react'
import { usePrevious } from '../../hooks'
import { v4 as uuidv4 } from 'uuid'
import {
    FormGroup,
    Label,
    FileInput,
    FileInputRef,
} from '@trussworks/react-uswds'
import { PoliteErrorMessage } from '../'
import { recordJSException } from '@mc-review/otel'
import styles from './FileUpload.module.scss'
import { FileItemT } from './FileProcessor/FileProcessor'
import { FileItemsList } from './FileItemList/FileItemsList'
import { pluralize, calculateSHA256 } from '@mc-review/common-code'
import { recordUserInputException } from '@mc-review/otel'

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
    uploadFile: (file: File, signal?: AbortSignal) => Promise<S3FileData>
    scanFile?: (key: string, signal?: AbortSignal) => Promise<void | Error>
    onFileItemsUpdate: ({ fileItems }: { fileItems: FileItemT[] }) => void
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
    onFileItemsUpdate,
    allowMultipleUploads = true,
    ...inputProps
}: FileUploadProps): React.ReactElement => {
    const [fileItems, setFileItems] = useState<FileItemT[]>(initialItems || [])
    const fileInputRef = useRef<FileInputRef>(null) // reference to the HTML input which has files
    const summaryRef = useRef<HTMLHeadingElement>(null) // reference to the heading that we will focus
    const operations = useRef(new Map<string, AbortController>())
    React.useEffect(() => {
        const pending = operations.current
        return () => {
            pending.forEach((controller) => controller.abort())
            pending.clear()
        }
    }, [])
    const previousFileItems = usePrevious(fileItems)
    const isRequired = inputProps['aria-required']
    const inputRequired = inputProps['aria-required'] || inputProps.required

    React.useEffect(() => {
        if (JSON.stringify(fileItems) !== JSON.stringify(previousFileItems)) {
            onFileItemsUpdate({ fileItems })
        }
    }, [fileItems, previousFileItems, onFileItemsUpdate])

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

            // Single-upload fields replace their file on each add, so a repeat
            // upload is just a replacement, not a duplicate. Only flag duplicate
            // names when multiple uploads are allowed.
            if (allowMultipleUploads && isDuplicateItem(fileItems, newItem)) {
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
        operations.current.get(deletedItem.id)?.abort()
        operations.current.delete(deletedItem.id)
        setFileItems((prevItems) => {
            return refreshItems(prevItems, deletedItem)
        })

        if (summaryRef.current) {
            summaryRef.current.focus()
        }
    }
    // Each item has its own cancellation scope, including uploads with identical
    // File objects/names. Removal, replacement and unmount stop further work.
    const asyncS3Upload = (items: FileItemT[]) => {
        const upload = async (fileItem: FileItemT) => {
            const file = fileItem.file
            if (!file) return
            operations.current.get(fileItem.id)?.abort()
            const controller = new AbortController()
            operations.current.set(fileItem.id, controller)
            let failureStatus: 'UPLOAD_ERROR' | 'SCANNING_ERROR' =
                'UPLOAD_ERROR'

            try {
                const sha = (await calculateSHA256(file)) || ''
                if (controller.signal.aborted) return
                const data = await uploadFile(file, controller.signal)
                if (controller.signal.aborted) return
                setFileItems((previous) =>
                    previous.map((item) =>
                        item.id === fileItem.id
                            ? {
                                  ...item,
                                  key: data.key,
                                  s3URL: data.s3URL,
                                  sha256: sha,
                                  status:
                                      item.status === 'DUPLICATE_NAME_ERROR'
                                          ? item.status
                                          : 'SCANNING',
                              }
                            : item
                    )
                )

                failureStatus = 'SCANNING_ERROR'
                if (scanFile) {
                    const result = await scanFile(data.key, controller.signal)
                    // The context's auth-recheck path can resolve an Error.
                    // A resolved promise alone is not proof of a clean scan.
                    if (result instanceof Error) throw result
                }
                if (controller.signal.aborted) return
                setFileItems((previous) =>
                    previous.map((item) =>
                        item.id === fileItem.id
                            ? {
                                  ...item,
                                  file: undefined,
                                  status:
                                      item.status === 'DUPLICATE_NAME_ERROR'
                                          ? item.status
                                          : 'UPLOAD_COMPLETE',
                              }
                            : item
                    )
                )
            } catch {
                if (controller.signal.aborted) return
                recordJSException(new Error(failureStatus))
                setFileItems((previous) =>
                    previous.map((item) =>
                        item.id === fileItem.id
                            ? {
                                  ...item,
                                  s3URL: undefined,
                                  status: failureStatus,
                              }
                            : item
                    )
                )
            } finally {
                // A retry may already own a new controller for this item. A
                // late completion must not remove that replacement's cancellation.
                if (operations.current.get(fileItem.id) === controller) {
                    operations.current.delete(fileItem.id)
                }
            }
        }

        items.forEach((item) => {
            void upload(item)
        })
    }

    const retryFile = (item: FileItemT) => {
        if (!item.file) {
            console.info('cannot retry, no file available')
            return
        }

        // Retry this item only; distinct items can reference the same File.
        setFileItems((prevItems) => {
            const newItems = [...prevItems]
            return newItems.map((i) => {
                if (item.id === i.id) {
                    return {
                        ...i,
                        status: 'PENDING',
                    } as FileItemT
                } else {
                    return i
                }
            })
        })

        asyncS3Upload([item])
    }

    const addFilesAndUpdateList = (files: File[]) => {
        const items = generateFileItems(files) // UI data objects -  used to track file upload state in a list below the input
        if (!allowMultipleUploads) {
            operations.current.forEach((controller) => controller.abort())
            operations.current.clear()
            setFileItems([])
        }
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)

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

            <PoliteErrorMessage id={`${id}-error`} formFieldLabel={label}>
                {error}
            </PoliteErrorMessage>
            {hint && (
                <span
                    id={`${id}-hint`}
                    role="note"
                    aria-labelledby={id}
                    className={styles.fileInputNote}
                >
                    {hint}
                </span>
            )}

            <FileInput
                id={id}
                name={`${name}${inputRequired ? ' (required)' : ''}`}
                className={styles.fileInput}
                aria-describedby={
                    error ? `${id}-error ${id}-hint` : `${id}-hint`
                }
                multiple={allowMultipleUploads}
                onChange={handleOnChange}
                onDrop={handleOnDrop}
                accept={inputProps.accept}
                ref={fileInputRef}
                aria-required={inputRequired}
            />
            <p tabIndex={-1} ref={summaryRef} className={styles.fileSummary}>
                {`${summary} ${summaryDetailText}`}
            </p>
            <FileItemsList
                retryItem={retryFile}
                deleteItem={deleteItem}
                fileItems={fileItems}
            />
        </FormGroup>
    )
}
