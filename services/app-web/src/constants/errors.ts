/*
    This file contains lang constants related to user facing error messages across the application. 
    - Use caution editing this file, you could be changing content used across multiple pages
*/

const ERROR_MESSAGES = {
    generic_error: "We're having trouble loading this page.",
    submit_error_heading: 'Submission error',
    submit_error_suggestion:
        'Please provide the required information before submitting.',
    submit_error_generic: 'Error attempting to submit.',
    submit_missing_field: 'Your submission is missing information.',
    unlock_error_heading: 'Unlock error',
    unlock_error_generic: 'Error attempting to unlock.',
    unlock_invalid_package_status:
        'Error attempting to unlock. Submission may be already unlocked.',
    resubmit_error_heading: 'Resubmission error',
    question_missing_field: 'Your question is missing information.',
    question_error_generic: 'Error attempting to add question.',
    response_error_generic: 'Error attempting to add response.',
    email_error_generic: 'Error attempting to send email.',
}

const MAIL_TO_SUPPORT = 'mc-review@cms.hhs.gov'

const GRAPHQL_ERROR_MESSAGES = {
    EMAIL_ERROR: 'Error attempting to send emails.',
    BAD_USER_INPUT: 'Your submission is missing information.',
    FORBIDDEN: 'User not authorized to fetch state data.',
}

export type GraphQLErrorTypes = keyof typeof GRAPHQL_ERROR_MESSAGES

export { MAIL_TO_SUPPORT, ERROR_MESSAGES, GRAPHQL_ERROR_MESSAGES }
