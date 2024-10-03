import React from 'react'
import type {
    TealiumButtonEventObject,
    TealiumLinkEventObject,
    TealiumDropdownSelectionEventObject,
    TealiumFilterEventObject,
    TealiumAlertImpressionObject,
    TealiumInlineErrorObject,
    TealiumRadioButtonEventObject,
    TealiumCheckboxEventObject,
    TealiumAccordionEventObject,
    TealiumFormSubmitEventObject
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
    logExternalLinkEvent: (
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
    logRadioButtonEvent: (
        tealiumData: Omit<TealiumRadioButtonEventObject, 'event_name'>
    ) => void
    logCheckboxEvent: (
        tealiumData: TealiumCheckboxEventObject
    ) => void
    logAccordionEvent: (
        tealiumData: TealiumAccordionEventObject
    ) => void
    logFormSubmitEvent: (
        tealiumData: TealiumFormSubmitEventObject
    ) => void
}

const useTealium = (): UseTealiumHookType => {
    const context = React.useContext(TealiumContext)

    if (context === undefined) {
        const warnNoTealium = () => console.warn('cannot log tealium event - Tealium Provider not loaded');
        return {
            logButtonEvent: warnNoTealium,
            logInternalLinkEvent: warnNoTealium,
            logExternalLinkEvent: warnNoTealium,
            logDropdownSelectionEvent: warnNoTealium,
            logFilterEvent: warnNoTealium,
            logInlineErrorEvent: warnNoTealium,
            logAlertImpressionEvent: warnNoTealium,
            logRadioButtonEvent: warnNoTealium,
            logCheckboxEvent: warnNoTealium,
            logFormSubmitEvent: warnNoTealium,
            logAccordionEvent: warnNoTealium

        };
    }

    const { pathname, loggedInUser, heading, logUserEvent } = context

    const logButtonEvent = (
        tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
    ) => {
        const logData: TealiumButtonEventObject = {
            ...tealiumData,
            link_type:  'link_other',
            event_name: 'button_engagement',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }

    const logInternalLinkEvent = (
        tealiumData: TealiumLinkEventObject
    ) => {
        const logData: TealiumLinkEventObject = {
            ...tealiumData,
            link_type:  'link_other',
            event_name: tealiumData.event_name ?? 'internal_link_clicked',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }

    const logExternalLinkEvent = (
        tealiumData: TealiumLinkEventObject
    ) => {
        const logData: TealiumLinkEventObject = {
            ...tealiumData,
            link_type:  'link_external',
            event_name: 'external_link_click',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }

    const logDropdownSelectionEvent = (
        tealiumData: Omit<TealiumDropdownSelectionEventObject, 'event_name'>
    ) => {
        const logData: TealiumDropdownSelectionEventObject = {
            ...tealiumData,
            event_name: 'dropdown_selection',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }

    const logFilterEvent = (
        tealiumData: TealiumFilterEventObject
    ) => logUserEvent(tealiumData, pathname, loggedInUser, heading)

    const logInlineErrorEvent = (
        tealiumData: Omit<TealiumInlineErrorObject, 'event_name'>
    ) => {
        const logData: TealiumInlineErrorObject = {
            ...tealiumData,
            event_name: 'inline_error',
            link_type:  'link_other',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
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

    const logRadioButtonEvent = (
        tealiumData: Omit<TealiumRadioButtonEventObject, 'event_name'>
    ) => {
        const logData: TealiumRadioButtonEventObject = {
            ...tealiumData,
            link_type: 'link_other',
            // Alerts usually are placed at top of pages. The way the app works, the form would be closely tied to the
            // pathname, so we can default to using that for the heading.
            event_name: 'radio_button_list_selected',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }

    const logCheckboxEvent = (
        tealiumData: TealiumCheckboxEventObject
    ) => logUserEvent(tealiumData, pathname, loggedInUser, heading)

    const logFormSubmitEvent = (
        tealiumData: TealiumFormSubmitEventObject
    ) =>  {
        const logData: TealiumFormSubmitEventObject = {
            ...tealiumData,
            link_type: 'link_other',
            event_name: 'form_field_submit'
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }


    const logAccordionEvent = (
        tealiumData: TealiumAccordionEventObject
    ) => {
        const logData: TealiumAccordionEventObject = {
            ...tealiumData,
            link_type: 'link_other',
        }
        logUserEvent(logData, pathname, loggedInUser, heading)
    }


    return {
        logButtonEvent,
        logInternalLinkEvent,
        logExternalLinkEvent,
        logDropdownSelectionEvent,
        logFilterEvent,
        logInlineErrorEvent,
        logAlertImpressionEvent,
        logRadioButtonEvent,
        logCheckboxEvent,
        logFormSubmitEvent,
        logAccordionEvent
    }
}

export { useTealium, type UseTealiumHookType }
