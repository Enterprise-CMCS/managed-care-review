import { User } from '../gen/gqlClient'
import {
    PageTitlesRecord,
    RouteT,
} from '../constants'
import * as React from 'react';
import {getRouteName} from '../routeHelpers';
import {createScript} from '../hooks/useScript';
import { getTealiumPageName } from './tealiumHelpers';

// TYPES
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

type ButtonEventStyle =
    | 'default'
    | 'primary'
    | 'success'
    | 'transparent'

type ButtonEventType =
    | 'submit'
    | 'link'
    | 'reset'
    | 'button'

type ButtonEventParentComponentType =
    | 'help drawer'
    | 'card'
    | 'modal'
    | 'overlay'
    | 'toggle'
    | 'page body'
    | 'constant header'

type TealiumButtonEventObject = {
    event_name: 'button_engagement',
    text: string
    link_type?: 'link_other'
    button_style?: ButtonEventStyle | string
    button_type?: ButtonEventType | string
    parent_component_heading?: string
    parent_component_type?: ButtonEventParentComponentType | string
    link_url?: string
    event_extension?: string
} & Partial<TealiumDataObject>

type TealiumInternalLinkEventObject = {
    event_name: 'internal_link_clicked'
    text: string
    link_url: string
    //link_type: string //currently not sending
    parent_component_heading?: string
    parent_component_type?: LinkEventParentComponentType | string
}

type LinkEventParentComponentType =
    | 'card'
    | 'modal'
    | 'help drawer'
    | 'resource-tray'
    | 'app page'
    | 'top navigation'

type TealiumLinkDataObject = {
    tealium_event: TealiumEvent // event is required for user tracking links
} & Partial<TealiumDataObject>

type TealiumViewDataObject = TealiumDataObject // event default to page_view in useTealium hook

type TealiumEventObjectTypes =
    | TealiumButtonEventObject
    | TealiumInternalLinkEventObject

// CONSTANTS
const CONTENT_TYPE_BY_ROUTE: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'root',
    AUTH: 'login',
    DASHBOARD: 'table',
    DASHBOARD_SUBMISSIONS: 'table',
    DASHBOARD_RATES: 'table',
    HELP: 'glossary',
    GRAPHQL_EXPLORER: 'dev',
    API_ACCESS: 'dev',
    SETTINGS: 'table',
    RATES_SUMMARY: 'summary',
    RATE_EDIT: 'form',
    SUBMISSIONS: 'form',
    SUBMISSIONS_NEW: 'form',
    SUBMISSIONS_EDIT_TOP_LEVEL: 'form',
    SUBMISSIONS_TYPE: 'form',
    SUBMISSIONS_CONTRACT_DETAILS: 'form',
    SUBMISSIONS_RATE_DETAILS: 'form',
    SUBMISSIONS_CONTACTS: 'form',
    SUBMISSIONS_DOCUMENTS: 'form',
    SUBMISSIONS_REVIEW_SUBMIT: 'form',
    SUBMISSIONS_SUMMARY: 'summary',
    SUBMISSIONS_REVISION: 'summary',
    SUBMISSIONS_QUESTIONS_AND_ANSWERS: 'summary',
    SUBMISSIONS_MCCRSID: 'form',
    SUBMISSIONS_UPLOAD_QUESTION: 'form',
    SUBMISSIONS_UPLOAD_RESPONSE: 'form',
    UNKNOWN_ROUTE: '404',
}

type TealiumEvent =
    | 'search'
    | 'submission_view'
    | 'user_login'
    | 'user_logout'
    | 'save_draft'
    | 'button_engagement'
    | 'internal_link_clicked'

type TealiumEnv =
    | 'prod'
    | 'val'
    | 'qa'
    | 'dev'

type TealiumClientType = {
    initializeTealium: (
        tealiumEnv: TealiumEnv,
        tealiumProfile: string
    ) => void
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

const tealiumClient = (): TealiumClientType => {
    return {
        initializeTealium: (
            tealiumEnv: TealiumEnv,
            tealiumProfile: string
        ) => {
            // Suppress automatic page views for SPA
            window.utag_cfg_ovrd = window.utag_cfg_ovrd || {}
            window.utag_cfg_ovrd.noview = true

            // Load utag.sync.js - add to head element - SYNC load from src
            const initializeTagManagerSnippet = createScript({
                src: `https://tags.tiqcdn.com/utag/cmsgov/${tealiumProfile}/${tealiumEnv}/utag.sync.js`,
                id: 'tealium-load-tags-sync',
            })
            if (document.getElementById(initializeTagManagerSnippet.id) === null) {
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
        logUserEvent:  (
            linkData: TealiumEventObjectTypes,
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement,
        ) => {
            const currentRoute = getRouteName(pathname)
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const utag = window.utag || { link: () => {}, view: () => {} }
            const tagData: TealiumLinkDataObject = {
                content_language: 'en',
                page_name: `${heading}: ${PageTitlesRecord[currentRoute]}`,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: `${process.env.REACT_APP_STAGE_NAME}`,
                site_section: `${currentRoute}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
                userId: loggedInUser?.email,
                tealium_event: linkData.event_name,
                ...linkData
            }
            console.log(linkData.event_name)
            console.log(tagData)
            utag.link(tagData)
        },
        logPageView: (
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement,
        ) => {
            const currentRoute = getRouteName(pathname)
            const tealiumPageName = getTealiumPageName({
                heading,
                route: currentRoute,
                user: loggedInUser,
            })
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const utag = window.utag || { link: () => {}, view: () => {} }
            const tagData: TealiumViewDataObject = {
                content_language: 'en',
                content_type: `${CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
                page_name: tealiumPageName,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: `${process.env.REACT_APP_STAGE_NAME}`,
                site_section: `${currentRoute}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
            }
            utag.view(tagData)
        }
    }
}

export { CONTENT_TYPE_BY_ROUTE, tealiumClient }
export type {
    TealiumLinkDataObject,
    TealiumViewDataObject,
    TealiumEvent,
    TealiumButtonEventObject,
    TealiumInternalLinkEventObject,
    TealiumEventObjectTypes,
    TealiumClientType,
    TealiumEnv
}
