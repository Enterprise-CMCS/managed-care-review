import { RouteT } from './routes'

const TEALIUM_NODE_ENV_MAP = {
    production: 'prod',
    test: 'qa',
    development: 'dev',
}

const CONTENT_TYPE_BY_ROUTE: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'summary',
    AUTH: 'login',
    DASHBOARD: 'table',
    HELP: 'glossary',
    SUBMISSIONS: 'form',
    SUBMISSIONS_NEW: 'form',
    SUBMISSIONS_FORM: 'form',
    SUBMISSIONS_TYPE: 'form',
    SUBMISSIONS_CONTRACT_DETAILS: 'form',
    SUBMISSIONS_RATE_DETAILS: 'form',
    SUBMISSIONS_CONTACTS: 'form',
    SUBMISSIONS_DOCUMENTS: 'form',
    SUBMISSIONS_REVIEW_SUBMIT: 'form',
    SUBMISSIONS_SUMMARY: 'summary',
    SUBMISSIONS_REVISION: 'summary',
    UNKNOWN_ROUTE: '404',
}

export { TEALIUM_NODE_ENV_MAP, CONTENT_TYPE_BY_ROUTE }
