import React from 'react'
import classnames from 'classnames'
import { FileRow } from '../FileRow/FileRow'
import { FileListItem } from '../FileListItem/FileListItem'

import styles from '../FileUpload.module.scss'
import { DocumentCategoryType } from '../../../common-code/domain-models'

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
    status: FileStatus
    documentCategories: DocumentCategoryType[]
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
                    Upload failed
                </span>
                <span className={styles.fileItemBoldMessage}>
                    Please remove or retry
                </span>
            </>
        )
    else if (hasUnexpectedError) {
        return (
            <>
                <span className={styles.fileItemBoldMessage}>
                    Upload failed
                </span>
                <span className={styles.fileItemBoldMessage}>
                    Unexpected error. Please remove.
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
    renderMode: 'table' | 'list'
    handleCheckboxClick: (event: React.ChangeEvent<HTMLInputElement>) => void
    isContractOnly?: boolean
}
export const FileProcessor = ({
    item,
    deleteItem,
    retryItem,
    renderMode,
    handleCheckboxClick,
    isContractOnly,
}: FileProcessorProps): React.ReactElement => {
    const { name, status, file } = item
    const isRateSupporting = item.documentCategories.includes('RATES_RELATED')
    const isContractSupporting =
        item.documentCategories.includes('CONTRACT_RELATED')
    const hasDuplicateNameError = status === 'DUPLICATE_NAME_ERROR'
    const hasScanningError = status === 'SCANNING_ERROR'
    const hasUploadError = status === 'UPLOAD_ERROR'
    const hasUnexpectedError = status === 'UPLOAD_ERROR' && file === undefined
    const hasRecoverableError =
        (hasUploadError || hasScanningError) && !hasUnexpectedError
    const isLoading = status === 'PENDING'
    const isScanning = status === 'SCANNING'

    const isPDF = name.indexOf('.pdf') > 0
    const isWord = name.indexOf('.doc') > 0 || name.indexOf('.pages') > 0
    const isVideo = name.indexOf('.mov') > 0 || name.indexOf('.mp4') > 0
    const isExcel = name.indexOf('.xls') > 0 || name.indexOf('.numbers') > 0
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

    return renderMode === 'table' ? (
        <FileRow
            errorRowClass={errorRowClass}
            isLoading={isLoading}
            isScanning={isScanning}
            isContractSupporting={isContractSupporting}
            isRateSupporting={isRateSupporting}
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
            handleCheckboxClick={handleCheckboxClick}
            isContractOnly={isContractOnly}
        />
    ) : (
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
            handleCheckboxClick={handleCheckboxClick}
        />
    )
}
