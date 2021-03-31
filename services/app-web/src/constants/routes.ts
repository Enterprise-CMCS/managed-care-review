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
    'HELP_SUBMISSION_DESCRIPTION',
    'SUBMISSIONS',
    'SUBMISSIONS_NEW',
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
    'SUBMISSIONS_EDIT',
] as const // iterable union type
type RouteT = typeof ROUTES[number]

const RoutesRecord: Record<RouteT, string> = {
    ROOT: '/',
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    HELP: '/help',
    HELP_SUBMISSION_DESCRIPTION: '/help/submission-description-examples',
    SUBMISSIONS: '/submissions',
    SUBMISSIONS_NEW: '/submissions/new',
    SUBMISSIONS_EDIT: '/submissions/:id',
    SUBMISSIONS_TYPE: '/submissions/:id/type',
    SUBMISSIONS_CONTRACT_DETAILS: '/submissions/:id/contract-details',
    SUBMISSIONS_RATE_DETAILS: '/submissions/:id/rate-details',
    SUBMISSIONS_CONTACTS: '/submissions/:id/contacts',
    SUBMISSIONS_DOCUMENTS: '/submissions/:id/documents',
    SUBMISSIONS_REVIEW_SUBMIT: '/submissions/:id/review-and-submit',
}

// Page headings used in <header> h1. Dynamic headings are set in page specific parent component.
const PageHeadingsRecord: Record<string, string> = {
    DASHBOARD: 'Managed Care Dashboard',
    SUBMISSIONS_NEW: 'New submission',
}

// Page titles used in <title>.
const PageTitlesRecord: Record<RouteT, string> = {
    ROOT: 'Home - Managed Care',
    AUTH: 'Login - Managed Care',
    HELP: 'Help - Managed Care',
    HELP_SUBMISSION_DESCRIPTION: 'Help - Managed Care',
    DASHBOARD: 'Dashboard - Managed Care',
    SUBMISSIONS: 'Submissions - Managed Care',
    SUBMISSIONS_NEW: 'New submission - Managed Care',
    SUBMISSIONS_EDIT: 'NEVER SEE ME',
    SUBMISSIONS_TYPE: 'Submission type - Managed Care',
    SUBMISSIONS_CONTRACT_DETAILS: 'Contract Details - Managed Care',
    SUBMISSIONS_RATE_DETAILS: 'Rate Details - Managed Care',
    SUBMISSIONS_CONTACTS: 'Contacts - Managed Care',
    SUBMISSIONS_DOCUMENTS: 'Documents - Managed Care',
    SUBMISSIONS_REVIEW_SUBMIT: 'Review and Submit - Managed Care',
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
    getRouteName,
}
