import React, { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { usePage } from './PageContext'
import { useAuth } from './AuthContext'
import { RouteT } from '@mc-review/constants'
import { getRouteName } from '../routeHelpers'
import type { User } from '../gen/gqlClient'
import type { TealiumClientType } from '../tealium'

type TealiumContextType = {
    pathname: string
    loggedInUser?: User
    heading?: string | React.ReactElement
} & TealiumClientType

type TealiumProviderProps = {
    client: TealiumClientType
    children?: React.ReactNode
}

const TealiumContext = React.createContext<TealiumContextType | undefined>(
    undefined
)

/*
Tealium is the data layer for Adobe Analytics and other data tracking at CMS
    The Provider has two purposes:
    1. Loads JavaScript code called utag.js into the application. This contains all of the generated code necessary to use Tealium and third-party tags.
    2. Tracks new page views using the Tealium Universal Data Format, defined in this doc: https://docs.tealium.com/platforms/javascript/universal-data-object/

    In addition, context returns functions for tracking user events. See Tealium docs on tracking: https://docs.tealium.com/platforms/javascript/track/
*/

const TealiumProvider = ({ client, children }: TealiumProviderProps) => {
    const location = useLocation()
    const { pathname } = location
    const { heading } = usePage()
    const { loggedInUser } = useAuth()
    const lastLoggedRoute = useRef<RouteT | 'UNKNOWN_ROUTE' | undefined>(
        undefined
    )

    const { logPageView, logUserEvent, initializeTealium } = client

    const handleLogPageView = useCallback(() => {
        lastLoggedRoute.current = getRouteName(pathname)
        logPageView(pathname, loggedInUser, heading)
    }, [heading, pathname, loggedInUser, logPageView])

    // Add Tealium setup
    // This effect should only fire on initial app load
    useEffect(() => {
        initializeTealium()
    }, [])

    // This effect should only fire each time the url changes
    useEffect(() => {
        if (lastLoggedRoute.current !== getRouteName(pathname)) {
            handleLogPageView()
        }
    }, [pathname, handleLogPageView])

    return (
        <TealiumContext.Provider
            value={{
                pathname,
                loggedInUser,
                heading,
                initializeTealium,
                logUserEvent,
                logPageView,
            }}
            children={children}
        />
    )
}

export { TealiumProvider, TealiumContext }
export type { TealiumContextType }
