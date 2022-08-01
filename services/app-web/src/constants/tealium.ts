import { RouteT } from './routes'

// map stage names to tealium env name
const getTealiumEnv = (stage: string) => {
    switch (stage) {
        case 'prod':
            return 'prod'
        case 'val':
            return 'qa'
        case 'main':
            return 'dev'
        default:
            return 'dev'
    }
}

const CONTENT_TYPE_BY_ROUTE: Record<RouteT | 'UNKNOWN_ROUTE', string> = {
    ROOT: 'root',
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

export { getTealiumEnv, CONTENT_TYPE_BY_ROUTE }
