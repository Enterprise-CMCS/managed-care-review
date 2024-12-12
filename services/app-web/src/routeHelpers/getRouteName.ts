import { matchPath, PathMatch } from 'react-router'
import { RouteT, RoutesRecord, ROUTES } from '@mc-review/constants'
import { isWildcardPath } from './isWildcardPath'
/* 
    Calculate the route name for a path (often from the current location). Relies on react-router matchPath. 
    
    @param pathname - full pathname - e.g. /submissions/123/edit/type
    @returns route type name - e.g. SUBMISSIONS_TYPE 
*/
type RouteMap = { route: RouteT; pathMatch: PathMatch<string> | null }
type RouteMapList = RouteMap[]

const getRouteName = (pathname: string): RouteT | 'UNKNOWN_ROUTE' => {
    const matchingRoutes: RouteMapList = []

    ROUTES.forEach((route) => {
        const pathMatch = matchPath(
            { path: RoutesRecord[route], end: true },
            pathname
        )

        if (pathMatch) {
            matchingRoutes.push({
                route,
                pathMatch,
            })
        }
    })

    if (matchingRoutes.length === 0) {
        return 'UNKNOWN_ROUTE'
    } else if (matchingRoutes.length === 1) {
        return matchingRoutes[0].route
    } else {
        // more than one potential match, discard wildcard routes
        const exactMatch = matchingRoutes.find(
            (routeMap) =>
                !isWildcardPath(RoutesRecord[routeMap.route]) &&
                RoutesRecord[routeMap.route] ===
                    routeMap.pathMatch?.pattern.path
        )

        if (!exactMatch?.route) {
            console.error(
                `CODING ERROR: Please check your routes, there were multiple matching potential route names for ${pathname}}.`
            )
        }
        return exactMatch?.route || 'UNKNOWN_ROUTE'
    }
}

export { getRouteName }
