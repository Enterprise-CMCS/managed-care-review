import React from 'react'
import { FileProcessor, FileItemT } from '../FileProcessor/FileProcessor'
import styles from '../FileUpload.module.scss'

type ListWrapperProps = {
    fileItems: FileItemT[]
    liClasses: (status: FileItemT['status']) => string
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
}

export const ListWrapper = ({
    fileItems,
    liClasses,
    deleteItem,
    retryItem,
}: ListWrapperProps): React.ReactElement => {
    return (
        <ul
            data-testid="file-input-preview-list"
            className={styles.fileItemsList}
            id="file-items-list"
            tabIndex={-1}
        >
            {fileItems.map((item) => (
                <li
                    key={item.id}
                    id={item.id}
                    className={liClasses(item.status)}
                >
                    <FileProcessor
                        deleteItem={deleteItem}
                        retryItem={retryItem}
                        item={item}
                    />
                </li>
            ))}
        </ul>
    )
}
