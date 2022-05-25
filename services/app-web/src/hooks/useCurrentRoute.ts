import { useLocation } from 'react-router-dom'
import { RouteT, getRouteName } from '../constants/routes'

// Determine current route (e.g. SUBMISSION_TYPE) using the getRouteName utility
const useCurrentRoute = (): { currentRoute: RouteT | 'UNKNOWN_ROUTE' } => {
    const { pathname } = useLocation()

    const routeName = getRouteName(pathname)
    return { currentRoute: routeName }
}

export { useCurrentRoute }
