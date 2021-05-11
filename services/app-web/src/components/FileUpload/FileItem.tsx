import React from 'react'
import { Button } from '@trussworks/react-uswds'
import classnames from 'classnames'
import { SPACER_GIF } from './constants'

import styles from './FileUpload.module.scss'

export type FileStatus =
    | 'DUPLICATE_NAME_ERROR'
    | 'PENDING'
    | 'UPLOAD_COMPLETE'
    | 'UPLOAD_ERROR'
    | 'SAVED_TO_SUBMISSION'

// TODO: May want to use a union data type here to further clarify states
// FileItemUploadComplete | FileItemUploadIncomplete
export type FileItemT = {
    id: string
    name: string
    file?: File // only items that are not uploaded to s3 have this
    url?: string // only items uploaded to s3 have this
    key?: string // only items uploaded to s3 have this
    s3URL?: string // only items uploaded to s3 have this
    status: FileStatus
}

export type FileItemProps = {
    item: FileItemT
    deleteItem: (item: FileItemT) => void
    retryItem: (item: FileItemT) => void
}
export const FileItem = ({
    item,
    deleteItem,
    retryItem,
}: FileItemProps): React.ReactElement => {
    const { name, status } = item
    const hasDuplicateNameError = status === 'DUPLICATE_NAME_ERROR'
    const hasUploadError = status === 'UPLOAD_ERROR'
    const isLoading = status === 'PENDING'
    const isPDF = name.indexOf('.pdf') > 0
    const isWord = name.indexOf('.doc') > 0 || name.indexOf('.pages') > 0
    const isVideo = name.indexOf('.mov') > 0 || name.indexOf('.mp4') > 0
    const isExcel = name.indexOf('.xls') > 0 || name.indexOf('.numbers') > 0
    const isGeneric = !isPDF && !isWord && !isVideo && !isExcel

    const imageClasses = classnames('usa-file-input__preview-image', {
        'is-loading': isLoading,
        'usa-file-input__preview-image--pdf': isPDF,
        'usa-file-input__preview-image--word': isWord,
        'usa-file-input__preview-image--video': isVideo,
        'usa-file-input__preview-image--excel': isExcel,
        'usa-file-input__preview-image--generic': isGeneric,
    })

    const handleDelete = (e: React.MouseEvent) => {
        deleteItem(item)
    }

    const handleRetry = (e: React.MouseEvent) => {
        retryItem(item)
    }

    const Error = (): React.ReactElement | null => {
        if (hasDuplicateNameError)
            return (
                <>
                    <span className={styles.fileItemErrorMessage}>
                        Duplicate file
                    </span>
                    <span className={styles.fileItemErrorMessage}>
                        Please remove
                    </span>
                </>
            )
        else if (hasUploadError)
            return (
                <>
                    <span className={styles.fileItemErrorMessage}>
                        Upload failed
                    </span>
                    <span className={styles.fileItemErrorMessage}>
                        Please remove or retry
                    </span>
                </>
            )
        else {
            return null
        }
    }

    return (
        <>
            <div className={styles.fileItemText}>
                <img
                    id={item.id}
                    data-testid="file-input-preview-image"
                    src={SPACER_GIF}
                    alt=""
                    className={imageClasses}
                />
                <span
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: 'inherit',
                    }}
                >
                    <Error />
                    <span>{name}</span>
                </span>
            </div>
            <div className={styles.fileItemButtons}>
                <Button
                    type="button"
                    size="small"
                    unstyled
                    onClick={handleDelete}
                >
                    Remove
                </Button>
                {hasUploadError && (
                    <Button
                        type="button"
                        size="small"
                        unstyled
                        onClick={handleRetry}
                    >
                        Retry
                    </Button>
                )}
            </div>
        </>
    )
}
