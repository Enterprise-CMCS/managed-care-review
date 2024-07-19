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
        tealiumData: TealiumInternalLinkEventObject,
    ) => void
} => {
    const context = React.useContext(TealiumContext)

    if (context === undefined) {
        return {
            logButtonEvent: () => {console.warn('cannot logButtonEven - Tealium Provider not loaded')},
            logInternalLinkEvent:  () => {console.warn('cannot logLinkEvent- Tealium Provider not loaded')}
        }
    }

    const { pathname, loggedInUser, heading, logUserEvent } = context

    const logButtonEvent = (
        tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
    ) => {
        const linkData: TealiumButtonEventObject = {
            ...tealiumData,
            link_type: tealiumData.link_url ? 'link_other' : undefined,
            event_name: 'button_engagement',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    const logInternalLinkEvent = (
        tealiumData: TealiumInternalLinkEventObject
    ) => {
        const linkData: TealiumInternalLinkEventObject = {
            ...tealiumData,
            event_name: tealiumData.event_name ?? 'internal_link_clicked',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

return { logButtonEvent, logInternalLinkEvent}
}

export { useTealium }
