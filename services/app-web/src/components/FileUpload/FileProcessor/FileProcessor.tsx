import React from 'react'
import classnames from 'classnames'
import { FileListItem } from '../FileListItem/FileListItem'
import path from 'path-browserify'

import styles from '../FileUpload.module.scss'

export type FileStatus =
    | 'DUPLICATE_NAME_ERROR'
    | 'PENDING'
    | 'SCANNING'
    | 'SCANNING_ERROR'
    | 'UPLOAD_COMPLETE'
    | 'UPLOAD_ERROR'

export type FileItemT = {
    id: string
    name: string
    file?: File // this becomes undefined after both uploading and scanning has completed with success
    key?: string // only items uploaded to s3 have this
    s3URL?: string // only items uploaded to s3 have this
    sha256?: string
    status: FileStatus
}

const fileTypes = {
    PDF: ['.pdf'],
    WORD: ['.doc', '.pages'],
    VIDEO: ['.mov', '.mp4'],
    EXCEL: ['.xls', '.xlsx', '.xlsm', '.xltm', '.xlam'],
}

const DocumentError = ({
    hasDuplicateNameError,
    hasScanningError,
    hasUploadError,
    hasUnexpectedError,
}: {
    hasDuplicateNameError: boolean
    hasScanningError: boolean
    hasUploadError: boolean
    hasUnexpectedError: boolean
}): React.ReactElement | null => {
    if (hasDuplicateNameError)
        return (
            <>
                <span className={styles.fileItemBoldMessage}>
                    Duplicate file, please remove
                </span>
            </>
        )
    else if (hasScanningError && !hasUnexpectedError)
        return (
            <>
                <span className={styles.fileItemBoldMessage}>
                    Failed security scan, please remove
                </span>
            </>
        )
    else if (hasUploadError && !hasUnexpectedError)
        return (
            <>
                <span className={styles.fileItemBoldMessage}>
                    Upload failed, please remove or retry
                </span>
            </>
        )
    else if (hasUnexpectedError) {
        return (
            <>
                <span className={styles.fileItemBoldMessage}>
                    Unexpected error, please remove
                </span>
            </>
        )
    } else {
        return null
    }
}

type FileProcessorProps = {
    item: FileItemT
    deleteItem: (item: FileItemT) => void
    retryItem: (item: FileItemT) => void
}
export const FileProcessor = ({
    item,
    deleteItem,
    retryItem,
}: FileProcessorProps): React.ReactElement => {
    const { name, status, file } = item
    const hasDuplicateNameError = status === 'DUPLICATE_NAME_ERROR'
    const hasScanningError = status === 'SCANNING_ERROR'
    const hasUploadError = status === 'UPLOAD_ERROR'
    const hasUnexpectedError = status === 'UPLOAD_ERROR' && file === undefined
    const hasRecoverableError =
        (hasUploadError || hasScanningError) && !hasUnexpectedError
    const isLoading = status === 'PENDING'
    const isScanning = status === 'SCANNING'
    const isComplete = status === 'UPLOAD_COMPLETE'
    const fileType = path.extname(name)

    const isPDF = fileTypes.PDF.indexOf(fileType) >= 0
    const isWord = fileTypes.WORD.indexOf(fileType) >= 0
    const isVideo = fileTypes.VIDEO.indexOf(fileType) >= 0
    const isExcel = fileTypes.EXCEL.indexOf(fileType) >= 0
    const isGeneric = !isPDF && !isWord && !isVideo && !isExcel

    const imageClasses = classnames('usa-file-input__preview-image', {
        'is-loading': isLoading || isScanning,
        'usa-file-input__preview-image--pdf': isPDF,
        'usa-file-input__preview-image--word': isWord,
        'usa-file-input__preview-image--video': isVideo,
        'usa-file-input__preview-image--excel': isExcel,
        'usa-file-input__preview-image--generic': isGeneric,
    })

    const handleDelete = (_e: React.MouseEvent) => {
        deleteItem(item)
    }

    const handleRetry = (_e: React.MouseEvent) => {
        retryItem(item)
    }

    let statusValue = ''
    if (isLoading) {
        statusValue = 'uploading'
    } else if (isScanning) {
        statusValue = 'scanning for viruses'
    } else if (isComplete) {
        statusValue = 'upload complete'
    } else if (
        hasDuplicateNameError ||
        hasScanningError ||
        hasUploadError ||
        hasUnexpectedError
    ) {
        statusValue = 'error'
    }

    const errorRowClass = classnames({
        'bg-error-lighter': statusValue === 'error',
    })

    return (
        <FileListItem
            errorRowClass={errorRowClass}
            isLoading={isLoading}
            isScanning={isScanning}
            statusValue={statusValue}
            item={item}
            imageClasses={imageClasses}
            documentError={
                <DocumentError
                    hasDuplicateNameError={hasDuplicateNameError}
                    hasScanningError={hasScanningError}
                    hasUploadError={hasUploadError}
                    hasUnexpectedError={hasUnexpectedError}
                />
            }
            hasRecoverableError={hasRecoverableError}
            handleDelete={handleDelete}
            handleRetry={handleRetry}
        />
    )
}
