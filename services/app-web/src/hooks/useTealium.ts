import React from 'react'
import type {
    TealiumButtonEventObject,
    TealiumLinkEventObject,
    TealiumDropdownSelectionEventObject,
    TealiumFilterEventObject,
    TealiumAlertImpressionObject,
    TealiumInlineErrorObject
} from '../tealium'
import { TealiumContext } from '../contexts/TealiumContext';
import {getRouteName} from '../routeHelpers';

type AlertImpressionFnArgType = Omit<TealiumAlertImpressionObject, 'event_name' | 'heading'> & { heading?: string }

type UseTealiumHookType = {
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
    logInlineErrorEvent: (
        tealiumData: Omit<TealiumInlineErrorObject, 'event_name'>
    ) => void
    logAlertImpressionEvent: (
        tealiumData: AlertImpressionFnArgType
    ) => void
}

const useTealium = (): UseTealiumHookType => {
    const context = React.useContext(TealiumContext)

    if (context === undefined) {
        const warnNoTealium = () => console.warn('cannot log tealium event - Tealium Provider not loaded');
        return {
            logButtonEvent: warnNoTealium,
            logInternalLinkEvent: warnNoTealium,
            logDropdownSelectionEvent: warnNoTealium,
            logFilterEvent: warnNoTealium,
            logInlineErrorEvent: warnNoTealium,
            logAlertImpressionEvent: warnNoTealium
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

    const logInlineErrorEvent = (
        tealiumData: Omit<TealiumInlineErrorObject, 'event_name'>
    ) => {
        const linkData: TealiumInlineErrorObject = {
            ...tealiumData,
            event_name: 'inline_error',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    const logAlertImpressionEvent = (
        tealiumData: AlertImpressionFnArgType
    ) => {
        const linkData: TealiumAlertImpressionObject = {
            ...tealiumData,
            // Alerts usually are placed at top of pages. The way the app works, the form would be closely tied to the
            // pathname, so we can default to using that for the heading.
            heading: tealiumData.heading || getRouteName(pathname),
            event_name: 'alert_impression',
        }
        logUserEvent(linkData, pathname, loggedInUser, heading)
    }

    return {
        logButtonEvent,
        logInternalLinkEvent,
        logDropdownSelectionEvent,
        logFilterEvent,
        logInlineErrorEvent,
        logAlertImpressionEvent
    }
}

export { useTealium, type UseTealiumHookType }
