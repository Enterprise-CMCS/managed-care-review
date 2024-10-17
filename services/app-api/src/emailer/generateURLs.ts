import { URL } from 'url'
import { compile } from 'path-to-regexp'

import { RoutesRecord } from '../../../app-web/src/constants/routes'

// Generates the correct url for the review and submit page for a given package id
// React Router uses the path-to-regexp library to generate URLs, we import it here to avoid loading
// all of react-router into our bundle.
function reviewAndSubmitURL(id: string, base: string): string {
    const pattern = RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT
    const toPath = compile(pattern, { encode: encodeURIComponent })
    const path = toPath({ id })
    const url = new URL(path, base).href

    return url
}

// Generates the correct url for the submission summary page for a given package id
// React Router uses the path-to-regexp library to generate URLs, we import it here to avoid loading
// all of react-router into our bundle.
function submissionSummaryURL(id: string, base: string): string {
    const pattern = RoutesRecord.SUBMISSIONS_SUMMARY
    const toPath = compile(pattern, { encode: encodeURIComponent })
    const path = toPath({ id })
    const url = new URL(path, base).href

    return url
}

function submissionQuestionResponseURL(id: string, base: string): string {
    const pattern = RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
    const toPath = compile(pattern, { encode: encodeURIComponent })
    const path = toPath({ id })
    const url = new URL(path, base).href

    return url
}

export {
    reviewAndSubmitURL,
    submissionSummaryURL,
    submissionQuestionResponseURL,
}
