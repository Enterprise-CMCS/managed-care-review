import React from 'react'
import { FileItemT } from '../FileProcessor/FileProcessor'

import styles from '../FileUpload.module.scss'
import { SPACER_GIF } from '@mc-review/constants'
import { ButtonWithLogging } from '../../TealiumLogging'

type FileListItemProps = {
    errorRowClass?: string
    isLoading: boolean
    isScanning: boolean
    statusValue: string
    item: FileItemT
    imageClasses: string
    documentError: React.ReactElement | null
    hasRecoverableError: boolean
    handleDelete: (_e: React.MouseEvent) => void
    handleRetry: (_e: React.MouseEvent) => void
}

export const FileListItem = ({
    isLoading,
    isScanning,
    statusValue,
    item,
    imageClasses,
    documentError,
    hasRecoverableError,
    handleDelete,
    handleRetry,
}: FileListItemProps): React.ReactElement => {
    const { name } = item
    return (
        <>
            <div className={styles.fileItemText}>
                <div
                    role="progressbar"
                    aria-valuetext={statusValue}
                    aria-label={`Status of file ${name}`}
                >
                    <img
                        id={item.id}
                        data-testid="file-input-preview-image"
                        src={SPACER_GIF}
                        alt=""
                        className={imageClasses}
                    />
                </div>
                <span
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: 'inherit',
                    }}
                >
                    {documentError}
                    <>
                        {(isLoading || isScanning) && (
                            <span className={styles.fileItemBoldMessage}>
                                {isLoading
                                    ? 'Step 1 of 2: Uploading'
                                    : 'Step 2 of 2: Scanning'}
                            </span>
                        )}
                        <span>{name}</span>
                    </>
                </span>
            </div>
            <div className={styles.fileItemButtons}>
                <ButtonWithLogging
                    type="button"
                    unstyled
                    onClick={handleDelete}
                    aria-label={`Remove ${name} document`}
                >
                    Remove
                </ButtonWithLogging>
                {hasRecoverableError && (
                    <ButtonWithLogging
                        type="button"
                        unstyled
                        onClick={handleRetry}
                        aria-label={`Retry upload for ${name} document`}
                    >
                        Retry
                    </ButtonWithLogging>
                )}
            </div>
        </>
    )
}
