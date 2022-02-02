import React from 'react'
import { FileItemT } from '../FileProcessor/FileProcessor'

import styles from '../FileUpload.module.scss'
import { Button, Checkbox } from '@trussworks/react-uswds'
import { SPACER_GIF } from '../constants'

type FileRowProps = {
    errorRowClass?: string
    isLoading: boolean
    isScanning: boolean
    isContractSupporting: boolean
    isRateSupporting: boolean
    statusValue: string
    item: FileItemT
    imageClasses: string
    documentError: React.ReactElement | null
    hasRecoverableError: boolean
    handleDelete: (_e: React.MouseEvent) => void
    handleRetry: (_e: React.MouseEvent) => void
    handleCheckboxClick: (event: React.ChangeEvent<HTMLInputElement>) => void
    isContractOnly?: boolean
}

export const FileRow = ({
    errorRowClass,
    isLoading,
    isScanning,
    isContractSupporting,
    isRateSupporting,
    statusValue,
    item,
    imageClasses,
    documentError,
    hasRecoverableError,
    handleDelete,
    handleRetry,
    handleCheckboxClick,
    isContractOnly,
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
                            id={item.id}
                            data-testid="file-input-loading-image"
                            src={SPACER_GIF}
                            alt=""
                            className={`${imageClasses} ${styles.loadingImage}`}
                        />
                    </span>
                ) : (
                    <span data-testid="upload-finished-indicator"></span>
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
            {!isContractOnly && (
                <td>
                    <Checkbox
                        className={styles.checkbox}
                        label=""
                        id={`${item.id}--contract`}
                        name="contract-supporting"
                        aria-label="contract-supporting"
                        aria-checked={isContractSupporting}
                        checked={isContractSupporting}
                        onChange={handleCheckboxClick}
                    />
                </td>
            )}
            {!isContractOnly && (
                <td>
                    <Checkbox
                        className={styles.checkbox}
                        label=""
                        id={`${item.id}--rate`}
                        name="rate-supporting"
                        aria-label="rate-supporting"
                        aria-checked={isRateSupporting}
                        checked={isRateSupporting}
                        onChange={handleCheckboxClick}
                    />
                </td>
            )}
            <td style={{ textAlign: 'right' }}>
                <Button
                    style={{ marginTop: 0 }}
                    type="button"
                    size="small"
                    aria-label={`Remove ${name} document`}
                    unstyled
                    onClick={handleDelete}
                >
                    Remove
                </Button>
                {hasRecoverableError && <span> or </span>}
                {hasRecoverableError && (
                    <Button
                        style={{ marginTop: 0 }}
                        type="button"
                        size="small"
                        aria-label={`Retry upload for ${name} document`}
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
