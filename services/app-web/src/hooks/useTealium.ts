import React from 'react'
import type {
    TealiumButtonEventObject,
    TealiumLinkEventObject,
    TealiumDropdownSelectionEventObject,
    TealiumFilterEventObject
} from '../tealium'
import { TealiumContext } from '../contexts/TealiumContext';

const useTealium = (): {
    logButtonEvent: (
        tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
    ) => void,
    logInternalLinkEvent: (
        tealiumData: TealiumLinkEventObject,
    ) => void,
    logDropdownSelectionEvent: (
        tealiumData: Omit<TealiumDropdownSelectionEventObject, 'event_name'>
    ) => void
    logFilterEvent: (
        tealiumData: TealiumFilterEventObject
    ) => void
} => {
    const context = React.useContext(TealiumContext)

    if (context === undefined) {
        const warnNoTealium = () => console.warn('cannot log tealium event - Tealium Provider not loaded');
        return {
            logButtonEvent: warnNoTealium,
            logInternalLinkEvent: warnNoTealium,
            logDropdownSelectionEvent: warnNoTealium,
            logFilterEvent: warnNoTealium
        };
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
        tealiumData: TealiumLinkEventObject
    ) => {
        const linkData: TealiumLinkEventObject = {
            ...tealiumData,
            event_name: tealiumData.event_name ?? 'internal_link_clicked',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    const logDropdownSelectionEvent = (
        tealiumData: Omit<TealiumDropdownSelectionEventObject, 'event_name'>
    ) => {
        const linkData: TealiumDropdownSelectionEventObject = {
            ...tealiumData,
            event_name: 'dropdown_selection',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    const logFilterEvent = (
        tealiumData: TealiumFilterEventObject
    ) => logUserEvent(tealiumData, pathname, loggedInUser, heading)

    return { logButtonEvent, logInternalLinkEvent, logDropdownSelectionEvent, logFilterEvent }
}

export { useTealium }
