import { useCallback, useEffect, useRef } from 'react'
import { usePage } from '../contexts/PageContext'
import { PageTitlesRecord, RouteT } from '../constants/routes'
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
import { useLocation } from 'react-router-dom'
import { getRouteName } from '../routeHelpers'
import { recordJSException } from '../otelHelpers'
import { createScript } from './useScript'

/*
Tealium is the data layer for Google Analytics and other data tracking at CMS
    The hooks in this file have two purposes:
    1. Loads JavaScript code called utag.js into the application. This contains all of the generated code necessary to use Tealium and third-party tags.
    2. Tracks new page views using the Tealium Universal Data Format, defined in this doc: https://docs.tealium.com/platforms/javascript/universal-data-object/

    In addition, useTealium returns a function for tracking user events. See Tealium docs on tracking: https://docs.tealium.com/platforms/javascript/track/
*/

const useTealium = (): {
    logUserEvent: (linkData: TealiumLinkDataObject) => void,
    logPageView: () => void
} => {
    const { pathname } = useLocation()
    const { heading } = usePage()
    const { loggedInUser } = useAuth()
    const lastLoggedRoute = useRef<RouteT | 'UNKNOWN_ROUTE' | undefined>(
       undefined
    )
    const logPageView = useCallback(() => {
        if (process.env.REACT_APP_STAGE_NAME === 'local') {
            return
        }
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

        lastLoggedRoute.current = currentRoute
     },[heading, pathname, loggedInUser])

    const logUserEvent = useCallback((linkData: {
        tealium_event: TealiumEvent
        content_type?: string
    }) => {
        if (process.env.REACT_APP_STAGE_NAME === 'local') {
            return
        }
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
            ...linkData,
        }
        utag.link(tagData)

    },[heading, pathname, loggedInUser])

    // Add Tealium setup
    // This effect should only fire on initial app load
    useEffect(() => {
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
            document.head.removeChild(initializeTagManagerSnippet)
        }
    }, [])

    // This effect should only fire each time the url changes
    useEffect(() => {
        // Guardrail on initial load - protect against trying to call utag page view before its loaded
      if (!window.utag) {

            new Promise(resolve => setTimeout(resolve, 1000)).finally( () =>{
            if (!window.utag) {
                recordJSException('Analytics did not load in time')
                return
            } else {
                logPageView()
             }
            })
        // Guardrail on subsequent page view  - protect against multiple calls when route seems similar
        } else if (window.utag && lastLoggedRoute.current &&  lastLoggedRoute.current !== getRouteName(pathname)) {
            logPageView()
        }

    }, [pathname, logPageView])

    return { logUserEvent, logPageView }
}

export { useTealium }
