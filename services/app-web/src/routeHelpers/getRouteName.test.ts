import { getRouteName } from './'
import { RouteT, RoutesRecord } from '../constants/routes'

describe('getRouteName', () => {
    describe('calculates valid routes properly', () => {
        const testCases: [string, RouteT][] = [
            [
                RoutesRecord.DASHBOARD_SUBMISSIONS,
                'DASHBOARD_SUBMISSIONS' as const,
            ],
            ['/submissions/new', 'SUBMISSIONS_NEW' as const],
            ['/submissions/23324234', 'SUBMISSIONS_SUMMARY' as const],
            ['/submissions/123213/edit/type', 'SUBMISSIONS_TYPE' as const],
            [
                '/submissions/123213/revisions/345',
                'SUBMISSIONS_REVISION' as const,
            ],
            [
                '/submissions/123213/edit/contract-details',
                'SUBMISSIONS_CONTRACT_DETAILS' as const,
            ],
            [
                '/submissions/123213/edit/rate-details',
                'SUBMISSIONS_RATE_DETAILS' as const,
            ],

            [
                '/submissions/123213/edit/contacts',
                'SUBMISSIONS_CONTACTS' as const,
            ],
            [
                '/submissions/123213/edit/documents',
                'SUBMISSIONS_DOCUMENTS' as const,
            ],

            [
                '/submissions/123213/edit/review-and-submit',
                'SUBMISSIONS_REVIEW_SUBMIT' as const,
            ],
        ]
        test.each(testCases)(
            'given %p as the pathname, returns the valid route %p',
            (pathname, expectedResult) => {
                const result = getRouteName(pathname)
                expect(result).toEqual(expectedResult)
            }
        )
    })

    describe('calculates invalid routes as UNKNOWN_ROUTE when expected', () => {
        const testCases: string[] = [
            '/not-a-real-place',
            '/submissions/23324234/not-a-real-place',
            '/submissions/123213/not-a-real-place/345',
        ]
        test.each(testCases)(
            'given %p as the pathname, returns UNKNOWN_ROUTE',
            (pathname) => {
                const result = getRouteName(pathname)
                expect(result).toBe('UNKNOWN_ROUTE' as const)
            }
        )
    })
})
