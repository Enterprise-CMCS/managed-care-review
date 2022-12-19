/*
    This file contains lang constants related to user facing error messages across the application. 
    - Use caution editing this file, you could be changing content used across multiple pages
*/
const ERROR_MESSAGES = {
    generic_error: "We're having trouble loading this page.",
    submit_error_generic: 'Error attempting to submit.',
    submit_missing_field:
        'Error attempting to submit. Please fill out required fields, including any new fields.',
    unlock_error_generic: 'Error attempting to unlock.',
    unlock_invalid_package_status:
        'Error attempting to unlock. Submission may be already unlocked.',
}

const MAIL_TO_SUPPORT =
    'mailto: mc-review@cms.hhs.gov, mc-review-team@truss.works'

export { MAIL_TO_SUPPORT, ERROR_MESSAGES }
