import { useEffect } from 'react'
import { useCurrentRoute } from './useCurrentRoute'
import { PageTitlesRecord } from '../constants/routes'
import { useAuth } from '../contexts/AuthContext'
import {
    TEALIUM_NODE_ENV_MAP,
    CONTENT_TYPE_BY_ROUTE,
} from '../constants/tealium'
const TEALIUM_PROFILE = 'foo'

const createScript = ({
    async = true,
    text = 'text/javascript',
    src,
    innerHTML,
}: {
    async?: HTMLScriptElement['async']
    text?: HTMLScriptElement['text']
    src?: HTMLScriptElement['src']
    innerHTML?: HTMLScriptElement['innerHTML']
}): HTMLScriptElement => {
    if (!src && !innerHTML) {
        console.error(
            'CODING ERROR: script tags must be set up with either a src or inner HTML'
        )
    }

    const script = document.createElement('script')
    script.async = async
    script.text = text
    script.src = src || ' '
    script.innerHTML = innerHTML || ''

    return script
}

// Tealium is the interface for Google Analytics and other data tracking
// This hook adds tealium related scripts to head and body tags, with handling for some generic boolean values to flag on or off
const useTealium = ({
    featureFlag = true,
}: {
    featureFlag?: boolean
}): void => {
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    console.log('in hook')
    useEffect(() => {
        console.log('in effect')
        // if (!featureFlag || process.env.REACT_APP_STAGE_NAME === 'local') return // do not add tealium for local dev
        const tealiumEnv = TEALIUM_NODE_ENV_MAP[process.env.NODE_ENV]
        // Add tag manager to head
        const initializeTagManagerSnippet = createScript({
            src: `https://tags.tiqcdn.com/utag/cmsgov/${TEALIUM_PROFILE}/${tealiumEnv}/utag.sync.js`,
        })
        document.head.appendChild(initializeTagManagerSnippet)

        // Add data layer to body
        // The Universal Data Object (UDO) is a JavaScript object called utag_data in which dynamic data from your webpage is passed to the Tealium tag.
        // The properties in this object are named using plain, vendor neutral terms that are specific to your business.
        const createDataLayerSnippet = createScript({
            innerHTML: `
            var utag_data = {
                "content_language": "en"     
                "content_type": "${CONTENT_TYPE_BY_ROUTE[currentRoute]}",    
                "page_name": ${PageTitlesRecord[currentRoute]}",
                "site_domain": "cms.gov",
                "site_environment": "${process.env.NODE_ENV}", 
                "site_section": "${currentRoute}", 
                "logged_in": "${loggedInUser ?? false}
            }`,
        })
        document.body.appendChild(createDataLayerSnippet)

        // Add tags to body
        // The Universal Tag is a small piece of JavaScript code called utag.js that contains all of the generated code necessary to load third-party tags onto your site.
        // It enables Tealium iQ Tag Management to fire tags. Must be added after the data layer script tag.
        const loadTagsSnippet = createScript({
            innerHTML: `(function (t, e, a, l, i, u, m) {
                t = 'cmsgov/' + ${process.env.TEALIUM_PROFILE}; 
                e = ${tealiumEnv}; 
                a = '/' + t + '/' + e + '/utag.js'; l = '//tags.tiqcdn.com/utag' + a; i = document; u = 'script'; m = i.createElement(u); m.src = l; m.type = 'text/java' + u; m.async = true; l = i.getElementsByTagName(u)[0]; l.parentNode.insertBefore(m, l);
            })();`,
        })
        document.body.appendChild(loadTagsSnippet)

        return () => {
            console.log('in cleanup')
            document.body.removeChild(loadTagsSnippet)
            document.body.removeChild(createDataLayerSnippet)
            document.head.removeChild(initializeTagManagerSnippet)
        }
    }, [featureFlag, currentRoute, loggedInUser])
}

export { useTealium }
