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
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_FORM',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
    'SUBMISSIONS_REVISION',
    'SUBMISSIONS_SUMMARY',
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

/*
    Static page headings used in <header> h1 when logged in. Dynamic headings, when necessary, are set in page specific parent component.
    Every route does not need a page heading in the record. It is a design choice what goes here. For example, we do not any headings when logged in user is on a Not Found page
*/
const PageHeadingsRecord: Record<string, string> = {
    ROOT: 'Dashboard',
    DASHBOARD: 'Dashboard',
    SUBMISSIONS_NEW: 'New submission',
}

// Static page titles used in <title>.
// Every route must have a page title in the record for accessibility reasons. Dynamic page titles, when necessary, are set in AppRoutes
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

export {
    PageHeadingsRecord,
    PageTitlesRecord,
    RoutesRecord,
    ROUTES,
    STATE_SUBMISSION_FORM_ROUTES,
}

export type { RouteT }
