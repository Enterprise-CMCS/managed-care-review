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
    'SUBMISSIONS_FORM',
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
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
    SUBMISSIONS_FORM: '/submissions/:id',
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
    ROOT: 'Home - Managed Care Review',
    AUTH: 'Login - Managed Care Review',
    HELP: 'Help - Managed Care Review',
    HELP_SUBMISSION_DESCRIPTION: 'Help - Managed Care Review',
    DASHBOARD: 'Dashboard - Managed Care Review',
    SUBMISSIONS: 'Submissions - Managed Care Review',
    SUBMISSIONS_NEW: 'New submission - Managed Care Review',
    SUBMISSIONS_FORM: 'Submissions - Managed Care Review',
    SUBMISSIONS_TYPE: 'Submission type - Managed Care Review',
    SUBMISSIONS_CONTRACT_DETAILS: 'Contract Details - Managed Care Review',
    SUBMISSIONS_RATE_DETAILS: 'Rate Details - Managed Care Review',
    SUBMISSIONS_CONTACTS: 'Contacts - Managed Care Review',
    SUBMISSIONS_DOCUMENTS: 'Documents - Managed Care Review',
    SUBMISSIONS_REVIEW_SUBMIT: 'Review and Submit - Managed Care Review',
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
