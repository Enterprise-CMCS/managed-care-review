import React from 'react'
import { FileItem, FileItemT } from './FileItem'

export const FileItemsList = ({
    fileItems,
    deleteItem,
}: {
    fileItems: FileItemT[]
    deleteItem: (id: string) => void
}): React.ReactElement => {
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
                        item.status === 'UPLOAD_ERROR'
                            ? 'bg-secondary-lighter border-secondary'
                            : 'usa-file-input__preview'
                    }
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        pointerEvents: 'all',
                    }}
                >
                    <FileItem deleteItem={deleteItem} item={item} />
                </li>
            ))}
        </ul>
    )
}
