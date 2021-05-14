import React from 'react'
import classnames from 'classnames'
import styles from './FileUpload.module.scss'
import { FileItem, FileItemT, FileStatus } from './FileItem'

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
            status === 'UPLOAD_ERROR' || status === 'DUPLICATE_NAME_ERROR'
        return classnames(styles.fileItem, {
            'bg-secondary-lighter border-secondary margin-top-1px': hasError,
            'usa-file-input__preview': !hasError,
        })
    }

    return (
        <ul
            data-testid="file-input-preview-list"
            className={styles.fileItemList}
        >
            {fileItems.map((item) => (
                <li
                    key={item.id}
                    id={item.id}
                    className={liClasses(item.status)}
                >
                    <FileItem
                        deleteItem={deleteItem}
                        retryItem={retryItem}
                        item={item}
                    />
                </li>
            ))}
        </ul>
    )
}
