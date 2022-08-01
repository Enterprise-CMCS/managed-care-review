import { useEffect } from 'react'
import { usePage } from '../contexts/PageContext'
import { useCurrentRoute } from './useCurrentRoute'
import { createScript } from './useScript'
import { PageTitlesRecord } from '../constants/routes'
import { useAuth } from '../contexts/AuthContext'
import {
    TEALIUM_NODE_ENV_MAP,
    CONTENT_TYPE_BY_ROUTE,
} from '../constants/tealium'

// Tealium is the interface for Google Analytics and other data tracking
// The Universal Tag (utag) is a small piece of JavaScript code called utag.js that contains all of the generated code necessary to load third-party tags onto your site.
// It enables Tealium iQ Tag Management to fire tags. Must be added after the data layer script tag.
// See CMS documentation site: https://confluence.cms.gov/display/BLSTANALYT/Page+Tracking+Template+-+Single+Page+Applications
// See tealium documentation:

const useTealium = (): void => {
    const { currentRoute, pathname } = useCurrentRoute()
    const { heading } = usePage()
    const { loggedInUser } = useAuth()

    // LOAD TEALIUM EFFECT - should only fire only on initial app load
    useEffect(() => {
        if (process.env.REACT_APP_STAGE_NAME === 'local') return // do not add tealium for local dev

        const tealiumEnv = TEALIUM_NODE_ENV_MAP[process.env.NODE_ENV]
        const tealiumProfile = process.env.REACT_APP_TEALIUM_PROFILE
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
            t = 'cmsgov/' + ${tealiumProfile}
            e = ${tealiumEnv}
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
            document.body.removeChild(loadTagsSnippet)
            document.head.removeChild(initializeTagManagerSnippet)
        }
    }, [])

    // ADD TAGS EFFECT -  should fire on each page load
    useEffect(() => {
        if (process.env.REACT_APP_STAGE_NAME === 'local') return // do not add tags for local dev

        // Guardrail - use a default utag value to protect against trying to call utag before its loaded.
        if (!window.utag) {
            console.error(
                'PROGRAMMING ERROR: tried to use tealium utag before it was loaded'
            )
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const utag = window.utag || { link: () => {}, view: () => {} }
        const tagData = {
            content_language: 'en',
            content_type: `${CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
            page_name: `${heading}: ${PageTitlesRecord[currentRoute]}`,
            page_path: pathname,
            site_domain: 'cms.gov',
            site_environment: `${process.env.NODE_ENV}`,
            site_section: `${currentRoute}`,
            logged_in: `${Boolean(loggedInUser) ?? false}`,
        }
        utag.view(tagData)
        console.log('utag view called with: ', tagData)
    }, [currentRoute, loggedInUser, pathname, heading])
}

export { useTealium }
