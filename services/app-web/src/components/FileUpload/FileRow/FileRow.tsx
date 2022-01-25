import React from 'react'
import { FileItemT } from '../FileItem/FileItem'

import styles from '../FileUpload.module.scss'
import { Button } from '@trussworks/react-uswds'
import { SPACER_GIF } from '../constants'

type FileRowProps = {
    errorRowClass?: string
    isLoading: boolean
    isScanning: boolean
    statusValue: string
    item: FileItemT
    imageClasses: string
    documentError: React.ReactElement | null
    hasDuplicateNameError: boolean
    hasScanningError: boolean
    hasUploadError: boolean
    hasUnexpectedError: boolean
    handleDelete: (_e: React.MouseEvent) => void
    handleRetry: (_e: React.MouseEvent) => void
}

export const FileRow = ({
    errorRowClass,
    isLoading,
    isScanning,
    statusValue,
    item,
    imageClasses,
    documentError,
    hasDuplicateNameError,
    hasScanningError,
    hasUploadError,
    hasUnexpectedError,
    handleDelete,
    handleRetry,
}: FileRowProps): React.ReactElement => {
    const { name } = item
    return (
        <tr className={`${errorRowClass} ${styles.warningRow}`}>
            <td>
                {isLoading || isScanning ? (
                    <span
                        role="progressbar"
                        aria-valuetext={statusValue}
                        aria-label={`Status of file ${name}`}
                    >
                        <img
                            style={{ float: 'left' }}
                            id={item.id}
                            data-testid="file-input-loading-image"
                            src={SPACER_GIF}
                            alt=""
                            className={imageClasses}
                        />
                    </span>
                ) : (
                    ''
                )}
                <span
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: 'inherit',
                    }}
                >
                    {documentError}

                    {(isLoading || isScanning) && (
                        <span className={styles.fileItemBoldMessage}>
                            {isLoading
                                ? 'Step 1 of 2: Uploading'
                                : 'Step 2 of 2: Scanning'}
                        </span>
                    )}
                    <span>{name}</span>
                </span>
            </td>
            <td style={{ textAlign: 'right' }}>
                <Button
                    style={{ marginTop: 0 }}
                    type="button"
                    size="small"
                    aria-label={`Retry upload for ${name} document`}
                    unstyled
                    onClick={handleDelete}
                >
                    Remove
                </Button>
                {(hasUploadError || hasScanningError) &&
                    !hasUnexpectedError && <span> or </span>}
                {(hasUploadError || hasScanningError) && !hasUnexpectedError && (
                    <Button
                        style={{ marginTop: 0 }}
                        type="button"
                        size="small"
                        unstyled
                        onClick={handleRetry}
                    >
                        Retry
                    </Button>
                )}
            </td>
        </tr>
    )
}
