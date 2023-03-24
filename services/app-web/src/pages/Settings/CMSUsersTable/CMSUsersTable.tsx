import { Table } from '@trussworks/react-uswds'
import React, { useCallback, useMemo } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import Select, { ActionMeta, OnChangeValue } from 'react-select'
import {
    CmsUser,
    useIndexUsersQuery,
    IndexUsersQuery,
    Division,
    useUpdateHealthPlanFormDataMutation,
} from '../../../gen/gqlClient'

import styles from '../Settings.module.scss'
import { Loading } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'

import { useUpdateCmsUserMutation } from '../../../gen/gqlClient'

const columnHelper = createColumnHelper<CmsUser>()

type DivisionSelectOptions = {
    label: string
    value: Division
}

export const CMSUsersTable = (): React.ReactElement => {
    // const [updateCmsUser] = useUpdateCmsUserMutation()
    const useMemoizedUpdateCmsUserMutation = () => {
        const [updateCmsUser] = useUpdateCmsUserMutation()

        return useMemo(() => updateCmsUser, [updateCmsUser])
    }
    const updateCmsUser = useMemoizedUpdateCmsUserMutation()

    const [updateform] = useUpdateHealthPlanFormDataMutation()

    const divisionSelect = useCallback(
        (
            currentAssignment:
                | DivisionSelectOptions['value']
                | null
                | undefined,
            row: CmsUser
        ) => {
            // console.log('divisionSelect called with:', currentAssignment, row)
            const handleChange = async (
                selectedOption: OnChangeValue<DivisionSelectOptions, false>,
                actionMeta: ActionMeta<DivisionSelectOptions>,
                row: CmsUser
            ) => {
                // console.log('handleChange called with:', selectedOption, row)
                if (selectedOption && 'value' in selectedOption) {
                    await updateform()
                    // await updateCmsUser({
                    //     variables: {
                    //         input: {
                    //             cmsUserID: row.id,
                    //             stateAssignments: [],
                    //             divisionAssignment: selectedOption.value,
                    //         },
                    //     },
                    // })
                    // await new Promise((resolve) => setTimeout(resolve, 2000))
                    // const updatedUser = await updateCmsUser({
                    //     variables: {
                    //         input: {
                    //             cmsUserID: row.id,
                    //             stateAssignments: [],
                    //             divisionAssignment: selectedOption.value,
                    //         },
                    //     },
                    // })
                    // console.log('Updated user:', updatedUser)
                    console.log('Selected value:', selectedOption.value)
                    console.log('Row object:', row)
                }
            }
            const options: DivisionSelectOptions[] = [
                { label: 'DMCO', value: 'DMCO' },
                { label: 'DMCP', value: 'DMCP' },
                { label: 'OACT', value: 'OACT' },
            ]

            const findOptionByValue = (
                value: Division | null | undefined
            ): DivisionSelectOptions | null => {
                if (!value) return null
                return options.find((option) => option.value === value) || null
            }
            const defaultOption = findOptionByValue(currentAssignment)

            return (
                <Select
                    value={defaultOption}
                    options={options}
                    onChange={(selectedOption, actionMeta) =>
                        handleChange(selectedOption, actionMeta, row)
                    }
                />
            )
        },
        [updateform]
    )

    const { loading, data, error } = useIndexUsersQuery({
        fetchPolicy: 'cache-and-network',
    })
    // console.log('CMSUsersTable called with:', data)
    const showLoading = loading || !data

    const columns = useMemo(() => {
        console.log('columns useMemo called')
        return [
            columnHelper.accessor('familyName', {
                id: 'familyName',
                cell: (info) => info.getValue(),
                header: () => 'Family Name',
            }),
            columnHelper.accessor('givenName', {
                id: 'givenName',
                cell: (info) => info.getValue(),
                header: () => 'Given Name',
            }),
            columnHelper.accessor('email', {
                id: 'email',
                cell: (info) => info.getValue(),
                header: () => 'Email',
            }),
            columnHelper.accessor('divisionAssignment', {
                id: 'divisionAssignment',
                cell: (info) =>
                    divisionSelect(info.getValue(), info.row.original),
                header: () => 'Division',
            }),
        ]
    }, [divisionSelect])

    // pick out the part of IndexUsersQuery that specifies Admin/CMS/StateUser
    type UserTypesInIndexQuery = Pick<
        IndexUsersQuery['indexUsers']['edges'][number],
        'node'
    >['node']

    const filterForCmsUsers = useMemo(() => {
        function isCmsUser(obj: UserTypesInIndexQuery): obj is CmsUser {
            return obj.__typename === 'CMSUser'
        }
        return (data: IndexUsersQuery | undefined): CmsUser[] => {
            if (!data) {
                return []
            }
            const cmsUsers = data.indexUsers.edges
                .filter((edge) => isCmsUser(edge.node))
                .map((edge) => edge.node as CmsUser)
            return cmsUsers
        }
    }, [])

    const cmsUsers = filterForCmsUsers(data)
    // console.log('cmsUsers:', cmsUsers)
    // console.log('columns:', columns)

    const table = useReactTable({
        data: cmsUsers,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (error) {
        return <SettingsErrorAlert error={error} />
    }

    return (
        <div className={styles.table}>
            <h2>CMS users</h2>
            {showLoading ? (
                <Loading />
            ) : cmsUsers.length ? (
                <Table>
                    <caption className="srOnly">CMS Users</caption>
                    <thead className={styles.header}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext()
                                              )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : (
                <div>
                    <p>No CMS users to display</p>
                </div>
            )}
        </div>
    )
}

CMSUsersTable.whyDidYouRender = true
