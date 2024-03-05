/*
    Every application route is named here.
    These types ensure we use valid routes throughout the application..
*/
const ROUTES = [
    'ROOT',
    'AUTH',
    'DASHBOARD',
    'DASHBOARD_SUBMISSIONS',
    'DASHBOARD_RATES',
    'GRAPHQL_EXPLORER',
    'API_ACCESS',
    'HELP',
    'SETTINGS',
    'RATES_SUMMARY',
    'RATE_EDIT',
    'SUBMISSIONS',
    'SUBMISSIONS_NEW',
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_EDIT_TOP_LEVEL',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
    'SUBMISSIONS_REVIEW_SUBMIT_V2',
    'SUBMISSIONS_REVISION',
    'SUBMISSIONS_SUMMARY',
    'SUBMISSIONS_MCCRSID',
    'SUBMISSIONS_QUESTIONS_AND_ANSWERS',
    'SUBMISSIONS_UPLOAD_QUESTION',
    'SUBMISSIONS_UPLOAD_RESPONSE',
] as const // iterable union type
type RouteT = (typeof ROUTES)[number]
type RouteTWithUnknown = RouteT | 'UNKNOWN_ROUTE'
/*
    Every application url (excluding query parameters) is found in the RoutesRecord.
    These types ensure we use valid route throughout the application

    The suffix "_TOP_LEVEL" mean this route contains an global asterike has several descendant routes it covers

*/
const RoutesRecord: Record<RouteT, string> = {
    ROOT: '/',
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    DASHBOARD_SUBMISSIONS: '/dashboard/submissions',
    DASHBOARD_RATES: '/dashboard/rate-reviews',
    GRAPHQL_EXPLORER: '/dev/graphql-explorer',
    API_ACCESS: '/dev/api-access',
    HELP: '/help',
    SETTINGS: '/settings',
    RATES_SUMMARY: '/rates/:id',
    RATE_EDIT: '/rates/:id/edit',
    SUBMISSIONS: '/submissions',
    SUBMISSIONS_NEW: '/submissions/new',
    SUBMISSIONS_EDIT_TOP_LEVEL: '/submissions/:id/edit/*',
    SUBMISSIONS_TYPE: '/submissions/:id/edit/type',
    SUBMISSIONS_CONTRACT_DETAILS: '/submissions/:id/edit/contract-details',
    SUBMISSIONS_RATE_DETAILS: '/submissions/:id/edit/rate-details',
    SUBMISSIONS_CONTACTS: '/submissions/:id/edit/contacts',
    SUBMISSIONS_DOCUMENTS: '/submissions/:id/edit/documents',
    SUBMISSIONS_REVIEW_SUBMIT: '/submissions/:id/edit/review-and-submit',
    SUBMISSIONS_REVIEW_SUBMIT_V2: '/submissions/:id/edit/review-and-submit-v2',
    SUBMISSIONS_SUMMARY: '/submissions/:id',
    SUBMISSIONS_MCCRSID: '/submissions/:id/mccrs-record-number',
    SUBMISSIONS_REVISION: '/submissions/:id/revisions/:revisionVersion',
    SUBMISSIONS_QUESTIONS_AND_ANSWERS: '/submissions/:id/question-and-answers',
    SUBMISSIONS_UPLOAD_QUESTION:
        '/submissions/:id/question-and-answers/:division/upload-questions',
    SUBMISSIONS_UPLOAD_RESPONSE:
        '/submissions/:id/question-and-answers/:division/:questionID/upload-response',
}

// Constants for releated descendant routes
const DASHBOARD_ROUTES: RouteTWithUnknown[] = [
    'DASHBOARD_RATES',
    'DASHBOARD_SUBMISSIONS',
]

const STATE_SUBMISSION_FORM_ROUTES: RouteTWithUnknown[] = [
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
    'SUBMISSIONS_REVIEW_SUBMIT_V2',
]

const STATE_SUBMISSION_SUMMARY_ROUTES: RouteTWithUnknown[] = [
    'SUBMISSIONS_SUMMARY',
    'SUBMISSIONS_REVISION',
]

const QUESTION_RESPONSE_SHOW_SIDEBAR_ROUTES: RouteTWithUnknown[] = [
    'SUBMISSIONS_QUESTIONS_AND_ANSWERS',
    'SUBMISSIONS_SUMMARY',
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
    'SUBMISSIONS_REVIEW_SUBMIT_V2',
]

/*
    Page headings used in the <header> when user logged in.
    Dynamic headings, when necessary, are set in page specific parent component.
    Every route does not need a page heading in the record.
    It is a design choice what goes here. For example, we do not any headings when logged in user is on the help page.
    For a quick way to check page headings, look for the h1 of the application in the DOM tree. It is the dark blue row of the header.

*/
const PageHeadingsRecord: Partial<Record<RouteTWithUnknown, string>> = {
    ROOT: 'Dashboard',
    DASHBOARD_SUBMISSIONS: 'Submissions dashboard',
    DASHBOARD_RATES: 'Rate reviews dashboard',
    SUBMISSIONS_NEW: 'New submission',
    UNKNOWN_ROUTE: '404',
}

/*
    Static page titles used in <title>.
    Every route must have a page title in the record for accessibility reasons. Dynamic page titles, when necessary, are set in AppRoutes
    For a quick way to check page titles, look at the tab text in your browser.
*/
const PageTitlesRecord: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'Home',
    AUTH: 'Login',
    GRAPHQL_EXPLORER: 'GraphQL explorer',
    API_ACCESS: 'API Access',
    HELP: 'Help',
    SETTINGS: 'Settings',
    DASHBOARD: 'Dashboard',
    DASHBOARD_RATES: 'Rate review dashboard',
    DASHBOARD_SUBMISSIONS: 'Dashboard',
    RATES_SUMMARY: 'Rate summary',
    RATE_EDIT: 'Edit rate',
    SUBMISSIONS: 'Submissions',
    SUBMISSIONS_NEW: 'New submission',
    SUBMISSIONS_EDIT_TOP_LEVEL: 'Submissions',
    SUBMISSIONS_TYPE: 'Submission type',
    SUBMISSIONS_CONTRACT_DETAILS: 'Contract details',
    SUBMISSIONS_RATE_DETAILS: 'Rate details',
    SUBMISSIONS_CONTACTS: 'Contacts',
    SUBMISSIONS_DOCUMENTS: 'Supporting documents',
    SUBMISSIONS_MCCRSID: 'Add MC-CRS record number',
    SUBMISSIONS_REVIEW_SUBMIT: 'Review and submit',
    SUBMISSIONS_REVIEW_SUBMIT_V2: 'Review and submit V2',
    SUBMISSIONS_REVISION: 'Submission revision',
    SUBMISSIONS_SUMMARY: 'Submission summary',
    SUBMISSIONS_QUESTIONS_AND_ANSWERS: 'Q&A',
    SUBMISSIONS_UPLOAD_QUESTION: 'Add questions',
    SUBMISSIONS_UPLOAD_RESPONSE: 'Add response',
    UNKNOWN_ROUTE: 'Not found',
}

export {
    PageHeadingsRecord,
    PageTitlesRecord,
    RoutesRecord,
    ROUTES,
    STATE_SUBMISSION_FORM_ROUTES,
    STATE_SUBMISSION_SUMMARY_ROUTES,
    QUESTION_RESPONSE_SHOW_SIDEBAR_ROUTES,
    DASHBOARD_ROUTES,
}

export type { RouteT, RouteTWithUnknown }
