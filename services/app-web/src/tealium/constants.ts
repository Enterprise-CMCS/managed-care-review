import { RouteT } from '@mc-review/constants'

const TEALIUM_CONTENT_TYPE_BY_ROUTE: Record<RouteT | 'UNKNOWN_ROUTE', string> =
    {
        ROOT: 'homepage',
        AUTH: 'login',
        DASHBOARD: 'table',
        DASHBOARD_SUBMISSIONS: 'table',
        DASHBOARD_RATES: 'table',
        HELP: 'glossary',
        GRAPHQL_EXPLORER: 'dev',
        API_ACCESS: 'dev',
        SETTINGS: 'table',
        MCR_SETTINGS: 'table',
        STATE_ASSIGNMENTS: 'table',
        EDIT_STATE_ASSIGNMENTS: 'form',
        DIVISION_ASSIGNMENTS: 'table',
        AUTOMATED_EMAILS: 'table',
        SUPPORT_EMAILS: 'table',
        OAUTH_CLIENTS: 'table',
        CREATE_OAUTH_CLIENT: 'form',
        RATES_SUMMARY: 'summary',
        RATES_SUMMARY_QUESTIONS_AND_ANSWERS: 'summary',
        RATES_UPLOAD_QUESTION: 'form',
        RATE_EDIT: 'form',
        RATE_WITHDRAW: 'form',
        UNDO_RATE_WITHDRAW: 'form',
        SUBMISSIONS: 'form',
        SUBMISSIONS_NEW: 'form',
        SUBMISSIONS_EDIT_TOP_LEVEL: 'form',
        SUBMISSIONS_TYPE: 'form',
        SUBMISSIONS_CONTRACT_DETAILS: 'form',
        SUBMISSIONS_RATE_DETAILS: 'form',
        SUBMISSIONS_CONTACTS: 'form',
        SUBMISSIONS_DOCUMENTS: 'form',
        SUBMISSIONS_REVIEW_SUBMIT: 'form',
        SUBMISSIONS_SUMMARY: 'summary',
        SUBMISSIONS_REVISION: 'summary',
        SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS: 'summary',
        SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS: 'summary',
        SUBMISSIONS_MCCRSID: 'form',
        SUBMISSIONS_UPLOAD_CONTRACT_QUESTION: 'form',
        SUBMISSIONS_UPLOAD_CONTRACT_RESPONSE: 'form',
        SUBMISSIONS_UPLOAD_RATE_RESPONSE: 'form',
        SUBMISSIONS_RELEASED_TO_STATE: 'form',
        SUBMISSION_WITHDRAW: 'form',
        UNDO_SUBMISSION_WITHDRAW: 'form',
        UNKNOWN_ROUTE: '404',
    }

export { TEALIUM_CONTENT_TYPE_BY_ROUTE }
