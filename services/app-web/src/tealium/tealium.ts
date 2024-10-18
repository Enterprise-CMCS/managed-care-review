import { User } from '../gen/gqlClient'
import {
    PageTitlesRecord,
} from '../constants'
import * as React from 'react';
import {getRouteName} from '../routeHelpers';
import {createScript} from '../hooks/useScript';
import { getTealiumPageName } from './tealiumHelpers';
import {recordJSException} from '../otelHelpers';
import { TEALIUM_CONTENT_TYPE_BY_ROUTE } from './constants';
import {removeNullAndUndefined} from'../common-code/data/dataUtilities'
import { TealiumClientType, TealiumEnv, TealiumEventObjectTypes, TealiumInteractionEventDataObject, TealiumViewDataObject } from './types';

const tealiumClient = (tealiumEnv: Omit<TealiumEnv, 'dev'>): TealiumClientType => {
    const tealiumHostname =  'tealium-tags.cms.gov'
    return {
        initializeTealium: () => {
            // Suppress automatic page views for SPA
            window.utag_cfg_ovrd = window.utag_cfg_ovrd || {}
            window.utag_cfg_ovrd.noview = true

            const tealiumProfile = 'cms-mcreview'

            // Load utag.sync.js - add to head element - SYNC load from src
            const initializeTagManagerSnippet = createScript({
                src: `https://${tealiumHostname}/${tealiumProfile}/${tealiumEnv}/utag.sync.js`,
                id: 'tealium-load-tags-sync',
            })

            if (document.getElementById(initializeTagManagerSnippet.id) === null) {
                document.head.appendChild(initializeTagManagerSnippet)
            }

            // Load utag.js - Add to body element- ASYNC load inline script
            const asyncSrc = `//${tealiumHostname}/${tealiumProfile}/${tealiumEnv}/utag.js`

            const loadTagsSnippet = createScript({
                src: asyncSrc,
                id: 'tealium-load-tags-async',
                async: true
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
            const tagData: TealiumInteractionEventDataObject = removeNullAndUndefined({
                content_language: 'en',
                page_name: `${heading}: ${PageTitlesRecord[currentRoute]}`,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: `${tealiumEnv}`,
                role: loggedInUser?.role.toLowerCase(),
                logged_in: `${Boolean(loggedInUser) ?? false}`,
                userId: loggedInUser?.id,
                tealium_event: linkData.event_name,
                link_type: 'link_other',
                ...linkData
            })
            utag.link(tagData)
        },
        logPageView: async (
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

            const tagData: TealiumViewDataObject = removeNullAndUndefined({
                content_language: 'en',
                content_type: `${TEALIUM_CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
                page_name: tealiumPageName,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: `${tealiumEnv}`,
                logged_in: `${Boolean(loggedInUser) ?? false}`,
                role: loggedInUser?.role.toLowerCase(),
                userId: loggedInUser?.id,
            })

            if (!window.utag) {
                await new Promise((resolve) => setTimeout(resolve, 1000)).finally(() => {
                    if (!window.utag) {
                        recordJSException('Analytics did not load in time')
                        return
                    } else {
                        window.utag.view(tagData)
                    }
                })
            } else {
                window.utag.view(tagData)
            }
        }
    }
}

const devTealiumClient = (isLocal: boolean ): TealiumClientType => {
    return {
        initializeTealium: () => {
           if (isLocal) {
            console.info('[Tealium - dev] initializeTealium - No logs will be sent in dev or local environment.')
           }
        },
        logUserEvent:  (
            linkData: TealiumEventObjectTypes,
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement,
        ) => {
            const currentRoute = getRouteName(pathname)
            const tagData: TealiumInteractionEventDataObject = removeNullAndUndefined({
                content_language: 'en',
                page_name: `${heading}: ${PageTitlesRecord[currentRoute]}`,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: 'dev',
                role: loggedInUser?.role.toLowerCase(),
                logged_in: `${Boolean(loggedInUser) ?? false}`,
                userId: loggedInUser?.id,
                tealium_event: linkData.event_name,
                ...linkData
            })

           if(isLocal){
            console.info(`[Tealium - dev] logUserEvent - ${linkData.event_name}`)
            console.info(tagData)
           }
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
            const tagData: TealiumViewDataObject = removeNullAndUndefined({
                content_language: 'en',
                content_type: `${TEALIUM_CONTENT_TYPE_BY_ROUTE[currentRoute]}`,
                page_name: tealiumPageName,
                page_path: pathname,
                site_domain: 'cms.gov',
                site_environment: 'dev',
                logged_in: `${Boolean(loggedInUser) ?? false}`,
            })
            if(isLocal){
                console.info('[Tealium - dev] logPageView')
                console.info(tagData)
               }

        }
    }
}

export {tealiumClient, devTealiumClient }