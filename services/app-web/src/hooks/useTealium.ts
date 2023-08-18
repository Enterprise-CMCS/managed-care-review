import { useEffect } from 'react'
import { usePage } from '../contexts/PageContext'
import { useCurrentRoute } from './useCurrentRoute'
import { createScript } from './useScript'
import { PageTitlesRecord } from '../constants/routes'
import { useAuth } from '../contexts/AuthContext'
import {
    CONTENT_TYPE_BY_ROUTE,
    getTealiumEnv,
    getTealiumPageName,
} from '../constants/tealium'
import type {
    TealiumLinkDataObject,
    TealiumViewDataObject,
    TealiumEvent,
} from '../constants/tealium'

/*
Tealium is the data layer for Google Analytics and other data tracking at CMS
    The hooks in this file have two purposes:
    1. Loads JavaScript code called utag.js into the application. This contains all of the generated code necessary to use Tealium and third-party tags.
    2. Tracks new page views using the Tealium Universal Data Format, defined in this doc: https://docs.tealium.com/platforms/javascript/universal-data-object/

    In addition, useTealium returns a function for tracking user events. See Tealium docs on tracking: https://docs.tealium.com/platforms/javascript/track/
*/
const useTealium = (): {
    logTealiumEvent: (linkData: TealiumLinkDataObject) => void
} => {
    const { currentRoute, pathname } = useCurrentRoute()
    const { heading } = usePage()
    const { loggedInUser } = useAuth()
    const tealiumPageName = getTealiumPageName({
        heading,
        route: currentRoute,
        user: loggedInUser,
    })

    // Add Tealium setup
    // this effect should only fire on initial app load
    useEffect(() => {
        // Do not add tealium for local dev or review apps
        /* temp disable
        if (process.env.REACT_APP_AUTH_MODE !== 'IDM') {
            return
        }
        */

        const tealiumEnv = getTealiumEnv(
            process.env.REACT_APP_STAGE_NAME || 'main'
        )
        const tealiumProfile = 'cms-mcreview'
        if (!tealiumEnv || !tealiumProfile) {
            console.error(
                `Missing key configuration for Tealium. tealiumEnv: ${tealiumEnv} tealiumProfile: ${tealiumProfile}`
            )
        }

        // Suppress automatic page views for SPA
        window.utag_cfg_ovrd = window.utag_cfg_ovrd || {}
        window.utag_cfg_ovrd.noview = true

        // Load utag.sync.js - add to head element - SYNC load from src
        const initializeTagManagerSnippet = createScript({
            src: `https://tags.tiqcdn.com/utag/cmsgov/${tealiumProfile}/${tealiumEnv}/utag.sync.js`,
            id: 'tealium-load-tags-sync',
        })
        document.head.appendChild(initializeTagManagerSnippet)

        // Load utag.js - Add to body element- ASYNC load inline script
        const inlineScript =
            document.createTextNode(`(function (t, e, a, l, i, u, m) {
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
        })()`)

        const loadTagsSnippet = createScript({
            src: '',
            useInlineScriptNotSrc: true,
            id: 'tealium-load-tags-async',
        })
        loadTagsSnippet.appendChild(inlineScript)

        document.body.appendChild(loadTagsSnippet)

        return () => {
            // document.body.removeChild(loadTagsSnippet)
            document.head.removeChild(initializeTagManagerSnippet)
        }
    }, [])

    // Add page view
    // this effect should fire on each page view or if something changes about logged in user
    useEffect(() => {
        // Do not add tealium for local dev or review apps
        /* temp diable
        if (process.env.REACT_APP_AUTH_MODE !== 'IDM') {
            // console.info(`mock tealium page view: ${tealiumPageName}`)
            return
        }
        */

        // Guardrail - protect against trying to call utag before its loaded.
        if (!window.utag) {
            return
        }

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
    }, [currentRoute, loggedInUser, pathname, tealiumPageName])

    // Add user event
    const logTealiumEvent = (linkData: {
        tealium_event: TealiumEvent
        content_type?: string
    }) => {
        // Do not add events on local dev
        if (process.env.REACT_APP_STAGE_NAME === 'local') {
            // console.info(`mock tealium event: ${JSON.stringify(linkData)}`)
            return
        }

        // Guardrail - protect against trying to call utag before its loaded.
        if (!window.utag) {
            console.error(
                'PROGRAMMING ERROR: tried to use tealium utag before it was loaded'
            )
        }
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
            ...linkData,
        }
        utag.link(tagData)
    }

    return { logTealiumEvent }
}

export { useTealium }
