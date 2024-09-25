import React from 'react'
import { NavLinkWithLogging } from '../../../components'
import { AnalystDisplayType } from '../SettingsTables/StateAssignmentTable'

// This is a file contains settings cell components and formatters that will be used across the settings pages
const formatEmails = (arr?: string[]) =>
    arr ? arr.join(', ') : 'NOT DEFINED'

const formatUserName = (user: AnalystDisplayType) => `${user.givenName} ${user.familyName}`
const formatEmailsFromUsers = (arr?: AnalystDisplayType[]) => (arr ? arr.map(analyst => analyst.email).join(', ') : 'NOT DEFINED')
const formatUserNamesFromUsers = (arr?: AnalystDisplayType[]) =>  (arr ? arr.map(analyst => formatUserName(analyst)).join(', ') : '')

const EditLink = ({ url, rowID }: { url: string; rowID: string }) => {
    return (
        <NavLinkWithLogging
            key={rowID}
            to={url}
            data-testid={`edit-link-${rowID}`}
        >
            Edit
        </NavLinkWithLogging>
    )
}
export { EditLink, formatEmails, formatEmailsFromUsers, formatUserNamesFromUsers, formatUserName }
