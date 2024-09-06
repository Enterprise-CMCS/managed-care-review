import { GridContainer, Table } from '@trussworks/react-uswds'
import React, { useCallback, useMemo, useState } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import Select, { OnChangeValue } from 'react-select'
import {
    CmsUser,
    Division,
    useIndexUsersQuery,
    useUpdateDivisionAssignmentMutation,
} from '../../../gen/gqlClient'

import styles from '../Settings.module.scss'
import { handleApolloError } from '../../../gqlHelpers/apolloErrors'
import { updateDivisionAssignment } from '../../../gqlHelpers/updateDivisionAssignment'
import { ApolloError } from '@apollo/client'
import { useTealium } from '../../../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { hasAdminUserPermissions } from '../../../gqlHelpers'
import { Grid } from '@trussworks/react-uswds'
import { LinkWithLogging, Loading } from '../../../components'
import { useStringConstants } from '../../../hooks/useStringConstants'
import { wrapApolloResult } from '../../../gqlHelpers/apolloQueryWrapper'
import { SettingsErrorAlert } from '../SettingsErrorAlert'

type DivisionSelectOptions = {
    label: string
    value: Division
}

function DivisionSelect({
    currentAssignment,
    user,
    setDivision,
}: {
    currentAssignment: Division | null | undefined
    user: CmsUser
    setDivision: SetDivisionCallbackType
}): React.ReactElement {
    const [updateErrored, setUpdateErrored] = useState<boolean>(false)
    const { logDropdownSelectionEvent } = useTealium()

    async function handleChange(
        selectedOption: OnChangeValue<DivisionSelectOptions, false>,
        row: CmsUser
    ) {
        if (selectedOption && 'value' in selectedOption) {
            const err = await setDivision(row.id, selectedOption.value)
            if (err) {
                setUpdateErrored(true)
            } else {
                logDropdownSelectionEvent({
                    text: selectedOption.value,
                    heading: 'Division',
                })
                setUpdateErrored(false)
            }
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
            styles={{
                control: (baseStyles) => {
                    if (updateErrored) {
                        return {
                            ...baseStyles,
                            borderColor: 'red',
                            borderWidth: '3px',
                        }
                    }
                    return baseStyles
                },
            }}
            value={defaultOption}
            options={options}
            onChange={(selectedOption) => handleChange(selectedOption, user)}
        />
    )
}

// useReactTable wants to be called with data, preferably
function CMSUserTableWithData({
    cmsUsers,
    setDivision,
}: {
    cmsUsers: CmsUser[]
    setDivision: SetDivisionCallbackType
}): React.ReactElement {
    const { loggedInUser } = useAuth()

    const isAdminUser = hasAdminUserPermissions(loggedInUser)

    const columns = useMemo(() => {
        const columnHelper = createColumnHelper<CmsUser>()
        return [
            columnHelper.accessor('familyName', {
                id: 'familyName',
                cell: (info) => info.getValue(),
                header: 'Family Name',
            }),
            columnHelper.accessor('givenName', {
                id: 'givenName',
                cell: (info) => info.getValue(),
                header: 'Given Name',
            }),
            columnHelper.accessor('email', {
                id: 'email',
                cell: (info) => info.getValue(),
                header: 'Email',
            }),
            columnHelper.accessor('divisionAssignment', {
                id: 'divisionAssignment',
                cell: (info) =>
                    isAdminUser ? (
                        <DivisionSelect
                            currentAssignment={info.getValue()}
                            user={info.row.original}
                            setDivision={setDivision}
                        />
                    ) : (
                        info.getValue()
                    ),
                header: 'Division',
                meta: {
                    dataTestID: 'division-assignment',
                },
            }),
        ]
    }, [setDivision, isAdminUser])

    const table = useReactTable({
        data: cmsUsers,
        filterFns: {
            dateRangeFilter: () => true,
        },
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <Table bordered fullWidth className={styles.table}>
            <caption className="srOnly">Division assignments</caption>
            <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
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
    )
}

type SetDivisionCallbackType = (
    userID: string,
    division: Division
) => Promise<undefined | Error>

export const DivisionAssignmentTable = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT

    const [updateDivisionAssignmentMutation] =
        useUpdateDivisionAssignmentMutation()

    const setDivisionCallback: SetDivisionCallbackType = useCallback(
        async (userID: string, division: Division) => {
            const res = await updateDivisionAssignment(
                updateDivisionAssignmentMutation,
                {
                    cmsUserID: userID,
                    divisionAssignment: division,
                }
            )

            if (res instanceof Error) {
                console.error('Errored attempting to update user: ', res)
                if (res instanceof ApolloError) {
                    handleApolloError(res, true)
                }
                return res
            }
            return undefined
        },
        [updateDivisionAssignmentMutation]
    )

    const { result: indexUsersResult } = wrapApolloResult(
        useIndexUsersQuery({
            fetchPolicy: 'cache-and-network',
        })
    )

    if (indexUsersResult.status === 'LOADING')
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )

    if (indexUsersResult.status === 'ERROR')
        return <SettingsErrorAlert error={indexUsersResult.error} />

    const cmsUsers = indexUsersResult.data.indexUsers.edges
        .filter(
            (edge) =>
                edge.node.__typename === 'CMSUser' ||
                edge.node.__typename === 'CMSApproverUser'
        )
        .map((edge) => edge.node as CmsUser)

    return (
        <Grid className={styles.tableContainer}>
            <h2>Division assignments</h2>
            <p>
                A list of CMS analysts and their division assignments. If this
                list is out of date please contact
                <span>
                    <LinkWithLogging
                        href={`mailto: ${MAIL_TO_SUPPORT}`}
                        variant="unstyled"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {` ${MAIL_TO_SUPPORT}.`}
                    </LinkWithLogging>
                </span>
            </p>
            {cmsUsers.length ? (
                <CMSUserTableWithData
                    cmsUsers={cmsUsers}
                    setDivision={setDivisionCallback}
                />
            ) : (
                <div>
                    <p>No CMS users to display</p>
                </div>
            )}
        </Grid>
    )
}

DivisionAssignmentTable.whyDidYouRender = true
