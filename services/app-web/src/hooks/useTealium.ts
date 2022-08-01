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
// The Universal Tag (utag) is a small piece of JavaScript code called utag.js that contains all of the generated code necessary to load third-party tags onto your site.
// It enables Tealium iQ Tag Management to fire tags. Must be added after the data layer script tag.
// See CMS documentation site: https://confluence.cms.gov/display/BLSTANALYT/Page+Tracking+Template+-+Single+Page+Applications
// See tealium documentation:

const useTealium = (): void => {
    const { currentRoute, pathname } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    // LOAD TEALIUM - this effect should only fire once
    useEffect(() => {
        console.log('in app load effect')
        // if (!featureFlag || process.env.REACT_APP_STAGE_NAME === 'local') return // do not add tealium for local dev
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

        // Load utag.sync.js - add Tealium Tag Manager to head element - SYNC
        const initializeTagManagerSnippet = createScript({
            src: `https://tags.tiqcdn.com/utag/cmsgov/${tealiumProfile}/${tealiumEnv}/utag.sync.js`,
            id: 'tealium-load-tags-sync',
        })
        document.head.appendChild(initializeTagManagerSnippet)

        // Load utag.js - Add tags to body element- ASYNC
        const loadTagsSnippet = createScript({
            src: `https://tags.tiqcdn.com/utag/cmsgov/${tealiumProfile}/${tealiumEnv}/utag.js`,
            id: 'tealium-load-tags-async',
        })

        document.body.appendChild(loadTagsSnippet)

        return () => {
            console.log('in app load cleanup')
            document.body.removeChild(loadTagsSnippet)
            document.head.removeChild(initializeTagManagerSnippet)
        }
    }, [])

    // ADD TAGS -  This effect should fire utag.view() on each page load
    useEffect(() => {
        console.log('in add tag effect')
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
            page_path: pathname,
            site_domain: 'cms.gov',
            site_environment: `${process.env.NODE_ENV}`,
            site_section: `${currentRoute}`,
            logged_in: `${loggedInUser ?? false}`,
        })
    }, [currentRoute, loggedInUser, pathname])
}

export { useTealium }
