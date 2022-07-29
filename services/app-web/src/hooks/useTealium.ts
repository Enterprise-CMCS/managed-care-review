import { useEffect } from 'react'
import { useCurrentRoute } from './useCurrentRoute'
import { createScript } from './useScript'
import { PageTitlesRecord } from '../constants/routes'
import { useAuth } from '../contexts/AuthContext'
import {
    TEALIUM_NODE_ENV_MAP,
    CONTENT_TYPE_BY_ROUTE,
} from '../constants/tealium'

// Tealium is the interface for Google Analytics and other data tracking
// This hook adds tealium related scripts to add utags
// The Universal Tag is a small piece of JavaScript code called utag.js that contains all of the generated code necessary to load third-party tags onto your site.
// It enables Tealium iQ Tag Management to fire tags. Must be added after the data layer script tag.
// See CMS documentation site: https://confluence.cms.gov/display/BLSTANALYT/Page+Tracking+Template+-+Single+Page+Applications
// See tealium documentation:

const useTealium = (): void => {
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    console.log('in hook')

    // LOAD TEALIUM - this effect should only fire once on page load
    useEffect(() => {
        console.log('in page load effect')
        // if (!featureFlag || process.env.REACT_APP_STAGE_NAME === 'local') return // do not add tealium for local dev
        const tealiumEnv = TEALIUM_NODE_ENV_MAP[process.env.NODE_ENV]

        // Load utag.sync.js - adds tag manager to head
        const initializeTagManagerSnippet = createScript({
            src: `https://tags.tiqcdn.com/utag/cmsgov/${process.env.TEALIUM_PROFILE}/${tealiumEnv}/utag.sync.js`,
        })
        document.head.appendChild(initializeTagManagerSnippet)

        // Supress automatic page views for SPA
        window.utag_cfg_ovrd = window.utag_cfg_ovrd || {}
        window.utag_cfg_ovrd.noview = true

        // Add data layer with tags for initial page load
        const createDataLayerSnippet = createScript({
            innerHTML: `
            var utag_data = {
                "content_language": "en"     
                "site_domain": "cms.gov",
                "site_section": "initial load"
                "site_environment": "${process.env.NODE_ENV}", 
            }`,
        })
        document.body.appendChild(createDataLayerSnippet)

        // Load utag.js - Add tags to body
        const loadTagsSnippet = createScript({
            innerHTML: `(function (t, e, a, l, i, u, m) {
                t = 'cmsgov/' + ${process.env.TEALIUM_PROFILE}; 
                e = ${tealiumEnv}; 
                a = '/' + t + '/' + e + '/utag.js'; l = '//tags.tiqcdn.com/utag' + a; i = document; u = 'script'; m = i.createElement(u); m.src = l; m.type = 'text/java' + u; m.async = true; l = i.getElementsByTagName(u)[0]; l.parentNode.insertBefore(m, l);
            })();`,
        })
        document.body.appendChild(loadTagsSnippet)

        return () => {
            console.log('in page load cleanup')
            document.body.removeChild(loadTagsSnippet)
            document.body.removeChild(createDataLayerSnippet)
            document.head.removeChild(initializeTagManagerSnippet)
        }
    }, [])

    // ADD TAGS -  This effect should fire utag.view() on each page load
    useEffect(() => {
        // Guardrail - we will use a default utag value to protect against trying to call utag before its loaded.
        if (!window.utag) {
            console.error(
                'PROGRAMMING ERROR: tried to use tealium utag before it was loaded'
            )
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const utag = window.utag || { link: () => {}, view: () => {} }

        utag.view({
            content_language: 'en',
            content_type: `${CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
            page_name: `${PageTitlesRecord[currentRoute]}`,
            site_domain: 'cms.gov',
            site_environment: `${process.env.NODE_ENV}`,
            site_section: `${currentRoute}`,
            logged_in: `${loggedInUser ?? false}`,
        })
    })
}

export { useTealium }
