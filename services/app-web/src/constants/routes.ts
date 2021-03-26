
const Routes =  {
    ROOT: '/',
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    HELP: '/help',
    HELP_SUBMISSION_DESCRIPTION: '/help/submission-description-examples',
    SUBMISSIONS: '/submissions',
    SUBMISSIONS_NEW: '/submissions/new',
    SUBMISSIONS_TYPE: '/submissions/type',
    SUBMISSIONS_CONTRACT_DETAILS: '/submissions/:id/contract-details',
    SUBMISSIONS_RATE_DETAILS:  '/submissions/:id/rate-details',
    SUBMISSIONS_DOCUMENTS: '/submissions/:id/documents',
    SUBMISSIONS_REVIEW_SUBMIT:'/submissions/:id/review-and-submit',
}

const PageTitlesRecord: Record<string, string> = {
    DASHBOARD: 'Managed Care Dashboard',
}

export {PageTitlesRecord, Routes}
