import { matchPath } from 'react-router'

/*
    Every application route is named here.
    These types ensure we use valid routes throughout the application.
    
    As of react-router v6, ROUTES is a list where order matters. 
    To allow us continue to properly match route names (with matchPath), routes names referring to wildcard route paths (e.g. /submissions/:id/edit/*) should be declared at the end of the ROUTES list.
*/
const ROUTES = [
    'ROOT',
    'AUTH',
    'DASHBOARD',
    'HELP',
    'SUBMISSIONS',
    'SUBMISSIONS_NEW',
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
    'SUBMISSIONS_REVISION',
    'SUBMISSIONS_SUMMARY',
    'SUBMISSIONS_FORM', // eep this at the end
] as const // iterable union type
type RouteT = typeof ROUTES[number]

const RoutesRecord: Record<RouteT, string> = {
    ROOT: '/',
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    HELP: '/help',
    SUBMISSIONS: '/submissions',
    SUBMISSIONS_NEW: '/submissions/new',
    SUBMISSIONS_FORM: '/submissions/:id/edit/*',
    SUBMISSIONS_TYPE: '/submissions/:id/edit/type',
    SUBMISSIONS_CONTRACT_DETAILS: '/submissions/:id/edit/contract-details',
    SUBMISSIONS_RATE_DETAILS: '/submissions/:id/edit/rate-details',
    SUBMISSIONS_CONTACTS: '/submissions/:id/edit/contacts',
    SUBMISSIONS_DOCUMENTS: '/submissions/:id/edit/documents',
    SUBMISSIONS_REVIEW_SUBMIT: '/submissions/:id/edit/review-and-submit',
    SUBMISSIONS_SUMMARY: '/submissions/:id',
    SUBMISSIONS_REVISION: '/submissions/:id/revisions/:revisionVersion',
}

const STATE_SUBMISSION_FORM_ROUTES: RouteT[] = [
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
]
// Static page headings used in <header> h1 when logged in. Dynamic headings, when necessary, are set in page specific parent component.
const PageHeadingsRecord: Record<string, string> = {
    ROOT: 'Dashboard',
    DASHBOARD: 'Dashboard',
    SUBMISSIONS_NEW: 'New submission',
}

// Static page titles used in <title>.
// Every route must have a fallback page title. Dynamic page title logic are set in AppRoutes.tsx
const PageTitlesRecord: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'Home',
    AUTH: 'Login',
    HELP: 'Help',
    DASHBOARD: 'Dashboard',
    SUBMISSIONS: 'Submissions',
    SUBMISSIONS_NEW: 'New submission',
    SUBMISSIONS_FORM: 'Submissions',
    SUBMISSIONS_TYPE: 'Submission type',
    SUBMISSIONS_CONTRACT_DETAILS: 'Contract details',
    SUBMISSIONS_RATE_DETAILS: 'Rate details',
    SUBMISSIONS_CONTACTS: 'Contacts',
    SUBMISSIONS_DOCUMENTS: 'Supporting documents',
    SUBMISSIONS_REVIEW_SUBMIT: 'Review and submit',
    SUBMISSIONS_REVISION: 'Submission revision',
    SUBMISSIONS_SUMMARY: 'Submission summary',
    UNKNOWN_ROUTE: 'Not found',
}

// Calculate the route  from a pathname - e.g. SUBMISSIONS_TYPE from 'submissions/123/edit/type'
const getRouteName = (pathname: string): RouteT | 'UNKNOWN_ROUTE' => {
    const matchingRouteNames = ROUTES.filter((route: RouteT) => {
        return matchPath({ path: RoutesRecord[route], end: true }, pathname)
    })

    if (matchingRouteNames.length === 0) {
        return 'UNKNOWN_ROUTE'
    } else if (matchingRouteNames.length === 1) {
        return matchingRouteNames[0]
    } else {
        // This for cases when there is more than one full path match
        // e.g. /submissions/:id/edit/type and /submissions/:id/edit/*  both match the pathname string /submissions/123123412/edit/type
        // We resolve by preferring the first instance of a match and ordering ROUTES array by specificity. This workaround was needed because as of v6 the matchPath 'exact' param is no longer present.
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

const isWildcardPath = (pathname: string) =>
    pathname.charAt(pathname.length + 1) === '*'

/* Calculate the relative path string for a nested route  - e.g. '/type' 
    base route refers to the route pointing to the section of the path you want to ignore - e.g. SUBMISSIONS_FORM
    target route refers to the nested route you are trying to get the relative path for - e.g. SUBMISSIONS_TYPE
*/
const getRelativePath = ({
    baseRoute,
    targetRoute,
}: {
    baseRoute: RouteT
    targetRoute: RouteT
}): string => {
    let baseRouteString = RoutesRecord[baseRoute]

    // remove wildcard if present
    if (isWildcardPath(baseRouteString)) {
        baseRouteString = baseRouteString.slice(0, -1)
    }
    return RoutesRecord[targetRoute].replace('submissions/:id/edit/', '')
}

export {
    PageHeadingsRecord,
    PageTitlesRecord,
    RoutesRecord,
    ROUTES,
    STATE_SUBMISSION_FORM_ROUTES,
    getRouteName,
    getRelativePath,
}

export type { RouteT }
