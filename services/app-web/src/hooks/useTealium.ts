import React from 'react'
import type {
    TealiumButtonEventObject,
    TealiumInternalLinkEventObject,
} from '../tealium'
import { recordJSException } from '../otelHelpers'
import { TealiumContext } from '../contexts/TealiumContext';

const useTealium = (): {
    logButtonEvent: (
        tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
    ) => void,
    logInternalLinkEvent: (
        tealiumData: Omit<TealiumInternalLinkEventObject, 'event_name'>,
    ) => void
} => {
    const context = React.useContext(TealiumContext)

    if (context === undefined) {
        const error = new Error('useTealium can only be used within an Tealium Provider')
        recordJSException(error)
        throw error
    }

    const { pathname, loggedInUser, heading, logUserEvent } = context

    const logButtonEvent = (
        tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
    ) => {
        const linkData: TealiumButtonEventObject = {
            ...tealiumData,
            event_name: 'button_engagement',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    const logInternalLinkEvent = (
        tealiumData: Omit<TealiumInternalLinkEventObject, 'event_name'>
    ) => {
        const linkData: TealiumInternalLinkEventObject = {
            ...tealiumData,
            event_name: 'internal_link_clicked',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    return { logButtonEvent, logInternalLinkEvent }
}

export { useTealium }
