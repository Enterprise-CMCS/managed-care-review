import { isWildcardPath } from './'

describe('isWildcardPath', () => {
    const testCases: [string, boolean][] = [
        ['/foo/bar/bar/*', true],
        ['/submissions/:id/edit/*', true],
        ['/submissions/:id/edit', false],
        ['/submissions/:id', false],
    ]
    test.each(testCases)('given %p returns %p', (path, expectedResult) => {
        const result = isWildcardPath(path)
        expect(result).toEqual(expectedResult)
    })
})
