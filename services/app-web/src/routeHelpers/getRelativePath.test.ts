import { getRelativePath } from './'
import { RoutesRecord } from '../constants/routes'

describe('getRelativePath', () => {
    describe('can calculate relative routes used within the health plan submission form', () => {
        const validCombinations: [string, string, string][] = [
            [
                RoutesRecord.SUBMISSIONS_TYPE,
                RoutesRecord.SUBMISSIONS_FORM,
                '/type',
            ],
            [
                RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
                RoutesRecord.SUBMISSIONS_FORM,
                '/contract-details',
            ],
            [
                RoutesRecord.SUBMISSIONS_RATE_DETAILS,
                RoutesRecord.SUBMISSIONS_FORM,
                '/rate-details',
            ],
            [
                RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
                RoutesRecord.SUBMISSIONS_FORM,
                '/contract-details',
            ],
            [
                RoutesRecord.SUBMISSIONS_CONTACTS,
                RoutesRecord.SUBMISSIONS_FORM,
                '/contacts',
            ],
            [
                RoutesRecord.SUBMISSIONS_DOCUMENTS,
                RoutesRecord.SUBMISSIONS_FORM,
                '/documents',
            ],
        ]
        test.each(validCombinations)(
            'given %p as the target route, and %p as the base route, returns the valid relative path %p',
            (targetPath, basePath, expectedResult) => {
                const result = getRelativePath({ targetPath, basePath })
                expect(result).toEqual(expectedResult)
            }
        )
    })

    describe('should return a relative path when present', () => {
        const validCombinations: [string, string, string][] = [
            ['/submissions/:id/foo', '/submissions/:id', '/foo'],
            ['/submissions/:id/foo', '/submissions', '/:id/foo'],
            [
                '/submissions/:id/review/bar/nested/doublynested',
                '/submissions/:id/review/bar/*',
                '/nested/doublynested',
            ],
        ]
        test.each(validCombinations)(
            'given %p as the target route, and %p as the base route, returns the valid relative path %p',
            (targetPath, basePath, expectedResult) => {
                const result = getRelativePath({ targetPath, basePath })
                expect(result).toEqual(expectedResult)
            }
        )
    })

    describe('should return the unchanged target pathname string when no relative path can be calculated', () => {
        const invalidCombinations: [string, string][] = [
            ['/submissions/:id/foo', '/not-a-match'],
            ['/submissions/:id/foo', '/not-a-match/*'],
        ]
        test.each(invalidCombinations)(
            'given %p as the target route and %p as the base route, returns the target route string',
            (targetPath, basePath) => {
                const result = getRelativePath({ targetPath, basePath })
                expect(result).toEqual(targetPath)
            }
        )
    })
})
