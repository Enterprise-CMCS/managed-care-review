import { matchPath, PathMatch } from 'react-router'
import { RouteT, RoutesRecord, ROUTES } from '../constants/routes'
import { isWildcardPath } from './isWildcardPath'
/* 
    Calculate the route from a pathname. Relies on react-router matchPath. 
    
    @param pathname - full pathname, likely from react-router location object
    @returns route type name assigned to that route - e.g. SUBMISSIONS_TYPE for 'submissions/123/edit/type'
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
                pathMatch: matchPath(
                    { path: RoutesRecord[route], end: true },
                    pathname
                ),
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
                `Coding error: Please check your routes, there were multiple matching potential route names for ${pathname}}.`
            )
        }
        return exactMatch?.route || 'UNKNOWN_ROUTE'
    }
}

export { getRouteName }
