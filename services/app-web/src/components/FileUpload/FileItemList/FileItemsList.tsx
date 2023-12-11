import React from 'react'
import classnames from 'classnames'
import { FileItemT, FileStatus } from '../FileProcessor/FileProcessor'
import styles from '../FileUpload.module.scss'
import { ListWrapper } from '../ListWrapper/ListWrapper'

export const FileItemsList = ({
    fileItems,
    deleteItem,
    retryItem,
}: {
    fileItems: FileItemT[]
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
}): React.ReactElement => {
    const liClasses = (status: FileStatus): string => {
        const hasError =
            status === 'UPLOAD_ERROR' ||
            status === 'SCANNING_ERROR' ||
            status === 'DUPLICATE_NAME_ERROR'
        return classnames(styles.fileItem, {
            'bg-error-lighter border-secondary margin-top-1px': hasError,
            'usa-file-input__preview': !hasError,
        })
    }

    return (
        <ListWrapper
            fileItems={fileItems}
            deleteItem={deleteItem}
            retryItem={retryItem}
            liClasses={liClasses}
        />
    )
}
