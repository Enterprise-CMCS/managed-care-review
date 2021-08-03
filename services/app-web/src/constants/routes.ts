import { matchPath } from 'react-router'

/*
    Every application route is named here.
    These types ensure we use valid routes throughout the application.
*/
const ROUTES = [
    'ROOT',
    'AUTH',
    'DASHBOARD',
    'HELP',
    'SUBMISSIONS',
    'SUBMISSIONS_NEW',
    'SUBMISSIONS_FORM',
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
] as const // iterable union type
type RouteT = typeof ROUTES[number]

const STATE_SUBMISSION_FORM_ROUTES = [
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
] as string[]

const RoutesRecord: Record<RouteT, string> = {
    ROOT: '/',
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    HELP: '/help',
    SUBMISSIONS: '/submissions',
    SUBMISSIONS_NEW: '/submissions/new',
    SUBMISSIONS_FORM: '/submissions/:id',
    SUBMISSIONS_TYPE: '/submissions/:id/type',
    SUBMISSIONS_CONTRACT_DETAILS: '/submissions/:id/contract-details',
    SUBMISSIONS_RATE_DETAILS: '/submissions/:id/rate-details',
    SUBMISSIONS_CONTACTS: '/submissions/:id/contacts',
    SUBMISSIONS_DOCUMENTS: '/submissions/:id/documents',
    SUBMISSIONS_REVIEW_SUBMIT: '/submissions/:id/review-and-submit',
}

// Static page headings used in <header> h1 when logged in. Dynamic headings, when necessary, are set in page specific parent component.
const PageHeadingsRecord: Record<string, string> = {
    ROOT: 'Dashboard',
    DASHBOARD: 'Dashboard',
    SUBMISSIONS_NEW: 'New Submission',
}

// Static page titles used in <title>.
// Every route must have a fallback page title. Dynamic page title logic are set in AppRoutes.tsx
const PageTitlesRecord: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'Home',
    AUTH: 'Login',
    HELP: 'Help',
    DASHBOARD: 'Dashboard',
    SUBMISSIONS: 'Submissions',
    SUBMISSIONS_NEW: 'New Submission',
    SUBMISSIONS_FORM: 'Submissions',
    SUBMISSIONS_TYPE: 'Submission Type',
    SUBMISSIONS_CONTRACT_DETAILS: 'Contract Details',
    SUBMISSIONS_RATE_DETAILS: 'Rate Details',
    SUBMISSIONS_CONTACTS: 'Contacts',
    SUBMISSIONS_DOCUMENTS: 'Documents',
    SUBMISSIONS_REVIEW_SUBMIT: 'Review and Submit',
    UNKNOWN_ROUTE: 'Not Found',
}

const getRouteName = (pathname: string): RouteT | 'UNKNOWN_ROUTE' => {
    const match = ROUTES.find((route) =>
        matchPath(pathname, {
            path: RoutesRecord[route],
            exact: true,
            strict: true,
        })
    )
    return match ? match : 'UNKNOWN_ROUTE'
}

export {
    PageHeadingsRecord,
    PageTitlesRecord,
    RoutesRecord,
    ROUTES,
    STATE_SUBMISSION_FORM_ROUTES,
    getRouteName,
}

export type { RouteT }
