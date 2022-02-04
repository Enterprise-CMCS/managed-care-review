import React from 'react'
import { FileProcessor, FileItemT } from '../FileProcessor/FileProcessor'
import { Table } from '@trussworks/react-uswds'

type TableWrapperProps = {
    fileItems: FileItemT[]
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
    handleCheckboxClick: (event: React.ChangeEvent<HTMLInputElement>) => void
    isContractOnly?: boolean
    shouldValidate?: boolean
}

export const TableWrapper = ({
    fileItems,
    deleteItem,
    retryItem,
    handleCheckboxClick,
    isContractOnly,
    shouldValidate,
}: TableWrapperProps): React.ReactElement => {
    return (
        <Table fullWidth>
            <thead>
                <tr>
                    <th>Document name</th>
                    {!isContractOnly && <th>Contract-supporting</th>}
                    {!isContractOnly && <th>Rate-supporting</th>}
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
                        shouldValidate={shouldValidate}
                    />
                ))}
            </tbody>
        </Table>
    )
}
