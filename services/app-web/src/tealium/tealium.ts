import { User } from '../gen/gqlClient'
import { PageTitlesRecord } from '@mc-review/constants'
import * as React from 'react'
import { getRouteName } from '../routeHelpers'
import { createScript } from '../hooks/useScript'
import { getTealiumPageName } from './tealiumHelpers'
import { recordJSException } from '@mc-review/otel'
import {
    TEALIUM_CONTENT_TYPE_BY_ROUTE,
    TEALIUM_SUBSECTION_BY_ROUTE,
} from './constants'

// TYPES
type TealiumEvent =
    | 'search'
    | 'submission_view'
    | 'user_login'
    | 'user_logout'
    | 'save_draft'
    | 'button_engagement'
    | 'internal_link_clicked'
    | 'navigation_clicked'
    | 'external_link_clicked'
    | 'back_button'
    | 'dropdown_selection'
    | 'filters_applied'
    | 'filter_removed'
    | 'inline_error'
    | 'alert_impression'
    | 'radio_button_list_selected'
    | 'checkbox_selected'
    | 'checkbox_unselected'

type TealiumEnv = 'prod' | 'qa' | 'dev'

type ButtonEventStyle =
    | 'default'
    | 'primary'
    | 'success'
    | 'secondary'
    | 'outline'
    | 'unstyled'

type ButtonEventType = 'submit' | 'link' | 'reset' | 'button'

type ButtonEventParentComponentType =
    | 'help drawer'
    | 'card'
    | 'modal'
    | 'overlay'
    | 'toggle'
    | 'page body'
    | 'constant header'

type LinkEventParentComponentType =
    | 'card'
    | 'modal'
    | 'help drawer'
    | 'resource-tray'
    | 'app page'
    | 'top navigation'

type TealiumDataObject = {
    content_language: string
    content_type: string
    page_name: string
    page_path: string
    site_domain: 'cms.gov'
    site_environment: string
    site_section: string
    logged_in: 'true' | 'false'
    userId?: string // custom attribute
    packageId?: string // custom attribute
    tealium_event?: TealiumEvent // this is required by tealium, TBD what allowed values aer here, usually this is supposed to be configured first .
}

type TealiumButtonEventObject = {
    event_name: 'button_engagement'
    text: string
    link_type?: 'link_other'
    button_style?: ButtonEventStyle
    button_type?: ButtonEventType | string
    parent_component_heading?: string
    parent_component_type?: ButtonEventParentComponentType | string
    link_url?: string
    event_extension?: string
}

type TealiumDropdownSelectionEventObject = {
    event_name: 'dropdown_selection'
    heading?: string
    text: string
    link_type?: string
}

// Used for internal links and navigation links
type TealiumLinkEventObject = {
    event_name: 'internal_link_clicked' | 'navigation_clicked' | 'back_button'
    text: string
    link_url: string
    //link_type: string //currently not sending
    parent_component_heading?: string
    parent_component_type?: LinkEventParentComponentType | string
}

type TealiumFilterAppliedType = {
    event_name: 'filters_applied'
    search_result_count: string
    link_type?: 'link_other'
    results_count_after_filtering: string
    results_count_prior_to_filtering: string
    filter_categories_used: string
}

type TealiumFilterRemovedType = {
    event_name: 'filter_removed'
    search_result_count: string
    link_type?: 'link_other'
    filter_categories_used: string
}

type TealiumInlineErrorObject = {
    event_name: 'inline_error'
    error_type: 'validation' | 'system'
    error_message: string
    error_code?: string
    form_field_label: string
    link_type?: 'link_other'
}

type TealiumAlertImpressionObject = {
    event_name: 'alert_impression'
    error_type: 'validation' | 'system'
    error_message: string
    error_code?: string
    heading: string
    type: 'alert' | 'warn' | 'error'
    extension?: string
}

type TealiumRadioButtonEventObject = {
    event_name: 'radio_button_list_selected'
    radio_button_title: string
    list_position: number
    list_options: number
    link_type?: 'link_other'
    parent_component_heading?: string
    parent_component_type?: string
    field_type: 'optional' | 'required'
    form_fill_status: boolean
}

type TealiumCheckboxEventObject = {
    event_name: 'checkbox_selected' | 'checkbox_unselected'
    text: string
    heading: string
    parent_component_heading?: string
    parent_component_type?: string
    field_type: 'optional' | 'required'
}

type TealiumFilterEventObject =
    | TealiumFilterAppliedType
    | TealiumFilterRemovedType

type TealiumLinkDataObject = {
    tealium_event: TealiumEvent // event is required for user tracking links
} & Partial<TealiumDataObject>

type TealiumViewDataObject = TealiumDataObject // event default to page_view in useTealium hook

type TealiumEventObjectTypes = (
    | TealiumButtonEventObject
    | TealiumLinkEventObject
    | TealiumDropdownSelectionEventObject
    | TealiumFilterEventObject
    | TealiumInlineErrorObject
    | TealiumAlertImpressionObject
    | TealiumCheckboxEventObject
    | TealiumRadioButtonEventObject
) &
    Partial<TealiumDataObject>

type TealiumClientType = {
    initializeTealium: () => void
    logUserEvent: (
        linkData: TealiumEventObjectTypes,
        pathname: string,
        loggedInUser?: User,
        heading?: string | React.ReactElement
    ) => void
    logPageView: (
        pathname: string,
        loggedInUser?: User,
        heading?: string | React.ReactElement
    ) => void
}

const tealiumClient = (
    tealiumEnv: Omit<TealiumEnv, 'dev'>
): TealiumClientType => {
    return {
        initializeTealium: () => {
            // Suppress automatic page views for SPA
            window.utag_cfg_ovrd = window.utag_cfg_ovrd || {}
            window.utag_cfg_ovrd.noview = true

            const tealiumProfile = 'cms-mcreview'

            // Load utag.sync.js - add to head element - SYNC load from src
            const initializeTagManagerSnippet = createScript({
                src: `https://tags.tiqcdn.com/utag/cmsgov/${tealiumProfile}/${tealiumEnv}/utag.sync.js`,
                id: 'tealium-load-tags-sync',
            })
            if (
                document.getElementById(initializeTagManagerSnippet.id) === null
            ) {
                document.head.appendChild(initializeTagManagerSnippet)
            }

            // Load utag.js - Add to body element- ASYNC load inline script
            const inlineScript = `(function (t, e, a, l, i, u, m) {
                t = 'cmsgov/${tealiumProfile}'
                e = '${tealiumEnv}'
                a = '/' + t + '/' + e + '/utag.js'
                l = '//tags.tiqcdn.com/utag' + a
                i = document
                u = 'script'
                m = i.createElement(u)
                m.src = l
                m.type = 'text/java' + u
                m.async = true
                l = i.getElementsByTagName(u)[0]
                l.parentNode.insertBefore(m, l)
            })()`

            const loadTagsSnippet = createScript({
                src: '',
                inlineScriptAsString: inlineScript,
                id: 'tealium-load-tags-async',
            })

            if (document.getElementById(loadTagsSnippet.id) === null) {
                document.body.appendChild(loadTagsSnippet)
            }
        },
        logUserEvent: (
            linkData: TealiumEventObjectTypes,
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement
        ) => {
            const currentRoute = getRouteName(pathname)
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const utag = window.utag || { link: () => {}, view: () => {} }
            const tagData: TealiumLinkDataObject = {
                content_language: 'en',
                page_name: `${heading}: ${PageTitlesRecord[currentRoute]}`,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: `${tealiumEnv}`,
                site_section: `${currentRoute}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
                userId: loggedInUser?.email,
                tealium_event: linkData.event_name,
                ...linkData,
            }
            utag.link(tagData)
        },
        logPageView: (
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement
        ) => {
            const currentRoute = getRouteName(pathname)
            const tealiumPageName = getTealiumPageName({
                heading,
                route: currentRoute,
                user: loggedInUser,
            })

            const tagData: TealiumViewDataObject = {
                content_language: 'en',
                content_type: `${TEALIUM_CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
                page_name: tealiumPageName,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: `${tealiumEnv}`,
                site_section: `${TEALIUM_SUBSECTION_BY_ROUTE[currentRoute]}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
            }

            if (!window.utag) {
                new Promise((resolve) => setTimeout(resolve, 1000)).finally(
                    () => {
                        if (!window.utag) {
                            recordJSException('Analytics did not load in time')
                            return
                        } else {
                            window.utag.view(tagData)
                        }
                    }
                )
                // Guardrail on subsequent page view  - protect against multiple calls when route seems similar
            } else {
                window.utag.view(tagData)
            }
        },
    }
}

const devTealiumClient = (): TealiumClientType => {
    return {
        initializeTealium: () => {
            console.info(
                '[Tealium - dev] initializeTealium - No logs will be sent in dev environment'
            )
        },
        logUserEvent: (
            linkData: TealiumEventObjectTypes,
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement
        ) => {
            const currentRoute = getRouteName(pathname)
            const tagData: TealiumLinkDataObject = {
                content_language: 'en',
                page_name: `${heading}: ${PageTitlesRecord[currentRoute]}`,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: 'dev',
                site_section: `${currentRoute}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
                userId: loggedInUser?.email,
                tealium_event: linkData.event_name,
                ...linkData,
            }

            console.info(
                `[Tealium - dev] logUserEvent - ${linkData.event_name}`
            )
            console.info(tagData)
        },
        logPageView: (
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement
        ) => {
            const currentRoute = getRouteName(pathname)
            const tealiumPageName = getTealiumPageName({
                heading,
                route: currentRoute,
                user: loggedInUser,
            })
            const tagData: TealiumViewDataObject = {
                content_language: 'en',
                content_type: `${TEALIUM_CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
                page_name: tealiumPageName,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: 'dev',
                site_section: `${TEALIUM_SUBSECTION_BY_ROUTE[currentRoute]}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
            }

            console.info('[Tealium - dev] logPageView')
            console.info(tagData)
        },
    }
}

export { tealiumClient, devTealiumClient }
export type {
    TealiumLinkDataObject,
    TealiumViewDataObject,
    TealiumEvent,
    TealiumButtonEventObject,
    TealiumLinkEventObject,
    TealiumEventObjectTypes,
    TealiumClientType,
    TealiumEnv,
    ButtonEventStyle,
    TealiumDropdownSelectionEventObject,
    TealiumFilterEventObject,
    TealiumInlineErrorObject,
    TealiumAlertImpressionObject,
    TealiumRadioButtonEventObject,
    TealiumCheckboxEventObject,
}
