import { TealiumClientType } from '../tealium';
import {UseTealiumHookType} from '../hooks/useTealium';

export const tealiumTestClient = (): TealiumClientType => {
    return {
        initializeTealium: () => {
            return
        },
        logUserEvent: () => {
            return
        },
        logPageView: () => {
            return
        },
    }
}

export const mockUseTealiumHookFunctions = (): UseTealiumHookType => ({
    logButtonEvent: () => {
        return
    },
    logInternalLinkEvent: () => {
        return
    },
    logDropdownSelectionEvent: () => {
        return
    },
    logFilterEvent: () => {
        return
    },
    logAlertImpressionEvent: () => {
        return
    },
    logInlineErrorEvent: () => {
        return
    },
    logCheckboxEvent: () => {
        return
    },
    logRadioButtonEvent: () => {
        return
    },
    logExternalLinkEvent: () => {
        return
    },
    logAccordionEvent: () => {
        return
    },
    logFormSubmitEvent: () => {
        return
    },
})
