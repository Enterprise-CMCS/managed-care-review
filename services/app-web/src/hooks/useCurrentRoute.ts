import { useLocation } from 'react-router-dom'
import { RouteT } from '../constants/routes'
import { getRouteName } from '../routeHelpers'

// Determine current route name type (e.g. SUBMISSION_TYPE) using the getRouteName utility
const useCurrentRoute = (): { currentRoute: RouteT | 'UNKNOWN_ROUTE' } => {
    const { pathname } = useLocation()

    const routeName = getRouteName(pathname)
    return { currentRoute: routeName }
}

export { useCurrentRoute }
