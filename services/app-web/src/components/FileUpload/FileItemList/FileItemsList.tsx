import React from 'react'
import classnames from 'classnames'
import { FileItemT, FileStatus } from '../FileItem/FileItem'
import styles from '../FileUpload.module.scss'
import { TableWrapper } from '../TableWrapper/TableWrapper'
import { ListWrapper } from '../ListWrapper/ListWrapper'

export const FileItemsList = ({
    fileItems,
    deleteItem,
    retryItem,
    renderMode,
}: {
    fileItems: FileItemT[]
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
    renderMode: 'table' | 'list'
}): React.ReactElement => {
    const liClasses = (status: FileStatus): string => {
        const hasError =
            status === 'UPLOAD_ERROR' ||
            status === 'SCANNING_ERROR' ||
            status === 'DUPLICATE_NAME_ERROR'
        return classnames(styles.fileItem, {
            'bg-secondary-lighter border-secondary margin-top-1px': hasError,
            'usa-file-input__preview': !hasError,
        })
    }

    return renderMode === 'table' ? (
        <TableWrapper
            fileItems={fileItems}
            deleteItem={deleteItem}
            retryItem={retryItem}
        />
    ) : (
        <ListWrapper
            fileItems={fileItems}
            deleteItem={deleteItem}
            retryItem={retryItem}
            liClasses={liClasses}
        />
    )
}
