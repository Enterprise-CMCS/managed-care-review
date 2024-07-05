import { User } from '../gen/gqlClient'
import {
    PageTitlesRecord,
    RouteT,
    STATE_SUBMISSION_FORM_ROUTES,
    STATE_SUBMISSION_SUMMARY_ROUTES,
} from './routes'
import * as React from 'react';
import {getRouteName} from '../routeHelpers';

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
    //link_type: string
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

// HELPER FUNCTIONS
function getTealiumEnv(stage: string) {
    switch (stage) {
        case 'prod':
            return 'prod'
        case 'val':
            return 'qa'
        case 'main':
            return 'dev'
        default:
            return 'dev'
    }
}

const getTealiumPageName = ({
    route,
    heading,
    user,
}: {
    route: RouteT | 'UNKNOWN_ROUTE'
    heading: string | React.ReactElement | undefined
    user: User | undefined
}) => {
    const addSubmissionNameHeading =
        STATE_SUBMISSION_FORM_ROUTES.includes(route) ||
        STATE_SUBMISSION_SUMMARY_ROUTES.includes(route)

    const formatPageName = ({
        heading,
        title,
    }: {
        title: string
        heading?: string | React.ReactElement
    }) => {
        const headingPrefix =
            heading && addSubmissionNameHeading ? `${heading}: ` : ''
        return `${headingPrefix}${title}`
    }
    switch (route) {
        case 'ROOT':
            if (!user) {
                return formatPageName({ title: 'Landing' })
            } else if (user.__typename === 'CMSUser') {
                return formatPageName({ heading, title: 'CMS Dashboard' })
            } else if (user.__typename === 'StateUser') {
                return formatPageName({
                    heading,
                    title: 'State dashboard',
                })
            }
            return formatPageName({ heading, title: PageTitlesRecord[route] })
        case 'DASHBOARD_SUBMISSIONS' || 'DASHBOARD_RATES':
            if (user && user.__typename === 'CMSUser') {
                return formatPageName({ title: 'CMS Dashboard' })
            } else if (user && user.__typename === 'StateUser') {
                return formatPageName({
                    heading,
                    title: 'State dashboard',
                })
            }
            return formatPageName({ heading, title: PageTitlesRecord[route] })

        default:
            return formatPageName({ heading, title: PageTitlesRecord[route] })
    }
}

type TealiumClientType = {
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

const newTealiumClient = () => {
    return {
        logUserEvent: function (
            linkData: TealiumEventObjectTypes,
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement,
        ) {
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
            utag.link(tagData)
        },
        logPageView: function (
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement,
        ) {
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

export { CONTENT_TYPE_BY_ROUTE, getTealiumEnv, getTealiumPageName, newTealiumClient }
export type {
    TealiumLinkDataObject,
    TealiumViewDataObject,
    TealiumEvent,
    TealiumButtonEventObject,
    TealiumInternalLinkEventObject,
    TealiumEventObjectTypes,
    TealiumClientType
}
