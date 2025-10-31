import { URL } from 'url'
import { compile } from 'path-to-regexp'
import { RoutesRecord } from '@mc-review/constants'

function generateUrl(
    id: string,
    contractSubmissionType: string,
    base: string,
    pattern: string
): string {
    const toPath = compile(pattern, { encode: encodeURIComponent })
    const path = toPath({ id, contractSubmissionType })

    return new URL(path, base).href
}

// Generates the correct url for the review and submit page for a given package id
// React Router uses the path-to-regexp library to generate URLs, we import it here to avoid loading
// all of react-router into our bundle.
function reviewAndSubmitURL(
    id: string,
    contractSubmissionType: string,
    base: string
): string {
    const pattern = RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT
    return generateUrl(id, contractSubmissionType, base, pattern)
}

// Generates the correct url for the submission summary page for a given package id
// React Router uses the path-to-regexp library to generate URLs, we import it here to avoid loading
// all of react-router into our bundle.
function submissionSummaryURL(
    id: string,
    contractSubmissionType: string,
    base: string
): string {
    const pattern = RoutesRecord.SUBMISSIONS_SUMMARY
    return generateUrl(id, contractSubmissionType, base, pattern)
}

function submissionQuestionResponseURL(
    id: string,
    contractSubmissionType: string,
    base: string
): string {
    const pattern = RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
    return generateUrl(id, contractSubmissionType, base, pattern)
}

function rateSummaryURL(
    id: string,
    contractSubmissionType: string,
    base: string
): string {
    const pattern = RoutesRecord.RATES_SUMMARY
    return generateUrl(id, contractSubmissionType, base, pattern)
}

function rateQuestionResponseURL(
    id: string,
    rateID: string,
    base: string
): string {
    const pattern = RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
    const toPath = compile(pattern, { encode: encodeURIComponent })
    const path = toPath({ id, rateID })
    const url = new URL(path, base).href

    return url
}

function rateSummaryQuestionResponseURL(
    rateID: string,
    contractSubmissionType: string,
    base: string
): string {
    const pattern = RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS
    return generateUrl(rateID, contractSubmissionType, base, pattern)
}

export {
    reviewAndSubmitURL,
    submissionSummaryURL,
    submissionQuestionResponseURL,
    rateQuestionResponseURL,
    rateSummaryQuestionResponseURL,
    rateSummaryURL,
}
