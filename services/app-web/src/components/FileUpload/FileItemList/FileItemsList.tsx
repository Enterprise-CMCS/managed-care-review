import React from 'react'
import classnames from 'classnames'
import { Table } from '@trussworks/react-uswds'
import { FileItem, FileItemT, FileStatus } from '../FileItem/FileItem'
import styles from '../FileUpload.module.scss'

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

    if (renderMode === 'table') {
        return (
            <Table fullWidth>
                <thead>
                    <tr>
                        <th>Document name</th>
                        <th>Date uploaded</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {fileItems.map((item) => (
                        <FileItem
                            key={item.id}
                            deleteItem={deleteItem}
                            retryItem={retryItem}
                            item={item}
                            renderMode="table"
                        />
                    ))}
                </tbody>
            </Table>
        )
    } else {
        return (
            <ul
                data-testid="file-input-preview-list"
                className={styles.fileItemsList}
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
                            renderMode="list"
                        />
                    </li>
                ))}
            </ul>
        )
    }
}
