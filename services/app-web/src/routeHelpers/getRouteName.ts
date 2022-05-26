import { matchPath } from 'react-router'
import { RouteT, RoutesRecord, ROUTES } from '../constants/routes'
/* 
    Calculate the route from a pathname 
    
    @param pathname - full pathname, likely from react-router location object
    @returns route type name assigned to that route - e.g. SUBMISSIONS_TYPE for 'submissions/123/edit/type'

   Uses react-router matchPath. The api changed in v6. Now when wildcard routes are used, there may be more than one full path match.
        e.g. /submissions/:id/edit/type and /submissions/:id/edit/*  will both match for SUBMISSION_TYPE
        To resolve the more than one match case, prefer the first instance of a match since the ROUTES array is ordered by specificity. 
*/
const getRouteName = (pathname: string): RouteT | 'UNKNOWN_ROUTE' => {
    const matchingRouteNames = ROUTES.filter((route: RouteT) => {
        return matchPath({ path: RoutesRecord[route], end: true }, pathname)
    })

    if (matchingRouteNames.length === 0) {
        return 'UNKNOWN_ROUTE'
    } else if (matchingRouteNames.length === 1) {
        return matchingRouteNames[0]
    } else {
        const exactMatch = matchingRouteNames.find(
            (route: RouteT) =>
                RoutesRecord[route] ===
                matchPath({ path: RoutesRecord[route], end: true }, pathname)
                    ?.pattern.path
        )
        if (!exactMatch) {
            console.error(
                `Coding error: Please check your routes, there were multiple matching potential route names but cannot find a match for ${pathname} from ${matchingRouteNames.toString()}`
            )
        }
        return exactMatch || 'UNKNOWN_ROUTE'
    }
}

export { getRouteName }
