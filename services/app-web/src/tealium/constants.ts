import { RouteT } from "../constants"

const TEALIUM_SUBSECTION_BY_ROUTE: Partial<Record<RouteT| 'UNKNOWN_ROUTE', string>> = {
    SUBMISSIONS_TYPE: 'submission edit',
    SUBMISSIONS_CONTRACT_DETAILS: 'submission edit',
    SUBMISSIONS_RATE_DETAILS: 'submission edit',
    SUBMISSIONS_CONTACTS: 'submission edit',
    SUBMISSIONS_DOCUMENTS: 'submission edit',
    SUBMISSIONS_REVIEW_SUBMIT: 'submission edit',
    SUBMISSIONS_SUMMARY: 'submission summary',
    SUBMISSIONS_REVISION: 'submission summary',
    SUBMISSIONS_QUESTIONS_AND_ANSWERS: 'submission summary',
    SUBMISSIONS_MCCRSID: 'submission cms edit',
    SUBMISSIONS_UPLOAD_QUESTION: 'questions',
    SUBMISSIONS_UPLOAD_RESPONSE: 'responses',
}


const TEALIUM_CONTENT_TYPE_BY_ROUTE: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'homepage',
    AUTH: 'login',
    DASHBOARD: 'table',
    DASHBOARD_SUBMISSIONS: 'table',
    DASHBOARD_RATES: 'table',
    HELP: 'glossary',
    GRAPHQL_EXPLORER: 'dev',
    API_ACCESS: 'dev',
    SETTINGS: 'table',
    MC_REVIEW_SETTINGS: 'table',
    RATES_SUMMARY: 'summary',
    REPLACE_RATE: 'form',
    RATE_EDIT: 'form',
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
    SUBMISSIONS_QUESTIONS_AND_ANSWERS: 'summary',
    SUBMISSIONS_MCCRSID: 'form',
    SUBMISSIONS_UPLOAD_QUESTION: 'form',
    SUBMISSIONS_UPLOAD_RESPONSE: 'form',
    UNKNOWN_ROUTE: '404',
}

export {
    TEALIUM_CONTENT_TYPE_BY_ROUTE,
    TEALIUM_SUBSECTION_BY_ROUTE
}
