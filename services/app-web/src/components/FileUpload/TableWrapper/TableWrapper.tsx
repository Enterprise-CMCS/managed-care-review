import React from 'react'
import { FileProcessor, FileItemT } from '../FileProcessor/FileProcessor'
import { Table } from '@trussworks/react-uswds'
import styles from './TableWrapper.module.scss'

type TableWrapperProps = {
    fileItems: FileItemT[]
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
    handleCheckboxClick: (event: React.ChangeEvent<HTMLInputElement>) => void
    isContractOnly?: boolean
    shouldDisplayMissingCategoriesError: boolean
}

export const TableWrapper = ({
    fileItems,
    deleteItem,
    retryItem,
    handleCheckboxClick,
    isContractOnly,
    shouldDisplayMissingCategoriesError
}: TableWrapperProps): React.ReactElement => {

    const hasFiles = fileItems.length > 0
    const shouldIncludeCategoriesCheckbox = !isContractOnly; 

    return (
        <>
            {hasFiles ? (
                <Table fullWidth>
                    <thead>
                        <tr>
                            <th>Document name</th>
                            {shouldIncludeCategoriesCheckbox && (
                                <th>Contract-supporting</th>
                            )}
                            {shouldIncludeCategoriesCheckbox && (
                                <th>Rate-supporting</th>
                            )}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fileItems.map((item) => (
                            <FileProcessor
                                key={item.id}
                                deleteItem={deleteItem}
                                retryItem={retryItem}
                                item={item}
                                renderMode="table"
                                handleCheckboxClick={handleCheckboxClick}
                                isContractOnly={isContractOnly}
                                shouldDisplayMissingCategoriesError={
                                    shouldDisplayMissingCategoriesError
                                }
                            />
                        ))}
                    </tbody>
                </Table>
            ) : (
                <div className={styles.filesEmpty}>
                    <h3>You have not uploaded any files</h3>
                </div>
            )}
        </>
    )
}
