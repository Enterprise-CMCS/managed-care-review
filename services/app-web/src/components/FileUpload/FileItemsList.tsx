import React from 'react'
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
    const hasError = (status: FileStatus) => {
        return status === 'UPLOAD_ERROR' || status === 'DUPLICATE_NAME_ERROR'
    }

    return (
        <ul
            style={{
                listStyleType: 'none',
                display: 'inline-block',
                padding: 0,
                margin: '0 0 -1px ',
                width: '480px',
            }}
        >
            {fileItems.map((item) => (
                <li
                    key={item.id}
                    id={item.id}
                    className={
                        hasError(item.status)
                            ? 'bg-secondary-lighter border-secondary margin-top-1px'
                            : 'usa-file-input__preview'
                    }
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px',
                        pointerEvents: 'all',
                    }}
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
