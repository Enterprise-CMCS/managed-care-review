import React from 'react'
import { FileItem, FileItemT } from '../FileItem/FileItem'
import { Table } from '@trussworks/react-uswds'

type TableWrapperProps = {
    fileItems: FileItemT[]
    deleteItem: (id: FileItemT) => void
    retryItem: (item: FileItemT) => void
}

export const TableWrapper = ({
    fileItems,
    deleteItem,
    retryItem,
}: TableWrapperProps): React.ReactElement => {
    return (
        <Table fullWidth>
            <thead>
                <tr>
                    <th>Document name</th>
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
}
