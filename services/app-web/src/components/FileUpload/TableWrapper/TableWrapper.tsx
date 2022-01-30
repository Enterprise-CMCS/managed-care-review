import React from 'react'
import { FileProcessor, FileItemT } from '../FileProcessor/FileProcessor'
import { Table } from '@trussworks/react-uswds'

type TableWrapperProps = {
    fileItems: FileItemT[]
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
    handleCheckboxClick: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export const TableWrapper = ({
    fileItems,
    deleteItem,
    retryItem,
    handleCheckboxClick,
}: TableWrapperProps): React.ReactElement => {
    return (
        <Table fullWidth>
            <thead>
                <tr>
                    <th>Document name</th>
                    <th>Contract-supporting</th>
                    <th>Rate-supporting</th>
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
                    />
                ))}
            </tbody>
        </Table>
    )
}
