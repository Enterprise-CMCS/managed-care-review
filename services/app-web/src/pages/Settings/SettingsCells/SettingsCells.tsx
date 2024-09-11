import React from 'react'
import { NavLinkWithLogging } from '../../../components'


// This is a file contains settings cell components and formatters that will be used across the settings pages

const formatEmails = (arr?: string[]) =>
    arr ? arr.join(', ') : 'NOT DEFINED'

const EditLink = ({url, rowID} : {url: string, rowID: string}) => {
    return (<NavLinkWithLogging
                key={rowID}
                to={url}
                data-testid={`edit-link-${rowID}`}
            >
                Edit
            </NavLinkWithLogging>
    )
}
export{ EditLink, formatEmails}