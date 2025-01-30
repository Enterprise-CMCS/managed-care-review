import React from 'react'
import { NavLinkWithLogging } from '../../../components'
import { AnalystDisplayType } from '../SettingsTables/StateAssignmentTable'

// This is a file contains settings cell components and formatters that will be used across the settings pages
const formatEmails = (arr?: string[]) => (arr ? arr.join(', ') : 'NOT DEFINED')

const formatUserName = (user: AnalystDisplayType) =>
    `${user.givenName} ${user.familyName}`
const formatEmailsFromUsers = (arr?: AnalystDisplayType[]) =>
    arr ? arr.map((analyst) => analyst.email).join(', ') : 'NOT DEFINED'
const formatUserNamesFromUsers = (arr?: AnalystDisplayType[]) =>
    arr ? arr.map((analyst) => formatUserName(analyst)).join(', ') : ''

const parseEmailData = (
    emailData: string[] | string
): { name: string; email: string }[] => {
    const emailArray = Array.isArray(emailData) ? emailData : [emailData]

    return emailArray.map((item) => {
        const [nameSection, emailSection] = item.split('<')
        const name = nameSection.trim().replace(/"/g, '')
        const email = emailSection.replace('>', '').trim()
        return { name, email }
    })
}

const EditLink = ({
    url,
    rowID,
    fieldName,
}: {
    url: string
    rowID: string
    fieldName: string
}) => {
    return (
        <NavLinkWithLogging
            key={rowID}
            to={url}
            aria-label={`Edit ${fieldName}`}
            data-testid={`edit-link-${rowID}`}
        >
            Edit
        </NavLinkWithLogging>
    )
}
export {
    EditLink,
    formatEmails,
    formatEmailsFromUsers,
    formatUserNamesFromUsers,
    formatUserName,
    parseEmailData,
}
