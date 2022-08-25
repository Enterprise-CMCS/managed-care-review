import React from 'react'
import { useDataExportQuery } from '../../gen/gqlClient'

export const Reports = (): React.ReactElement => {
    const { data, loading, error } = useDataExportQuery()
    return (
        <>
            <div>Reports</div>
            <div>{data?.dataExport?.name}</div>
            <div>{loading}</div>
            <div>{error?.message}</div>
        </>
    )
}
