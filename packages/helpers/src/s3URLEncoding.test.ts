import { parseBucketName, parseKey } from './s3URLEncoding'

describe('s3URLEncoding', () => {
    const invalidURLs = [
        'nots3://bucketName/key/fileName',
        's3://foo/foo/bar/foo',
        's3://foo/foo',
        's3://foo',
    ]

    describe('parseBucketName', () => {
        const validURLsAndBucket = [
            ['s3://bucketname/key/fileName', 'bucketname'],
            ['s3://1232jhkh1kh/1232jhkh1kh/test-file.pdf', '1232jhkh1kh'],
            ['s3://foo/bar/trussels guide.pdf', 'foo'],
        ]
        test.each(validURLsAndBucket)(
            'given %p as the potential url, returns %p for bucketName',
            (firstArg, expectedResult) => {
                const result = parseBucketName(firstArg)
                expect(result).toEqual(expectedResult)
            }
        )

        test.each(invalidURLs)(
            'given %p as the potential url, returns error',
            (firstArg) => {
                const result = parseKey(firstArg)
                expect(result).toBeInstanceOf(Error)
            }
        )
    })

    describe('parseKey', () => {
        const validURLsAndKey = [
            ['s3://bucketName/key/fileName', 'key'],
            ['s3://1232jhkh1kh/1232jhkh1kh/test-file.pdf', '1232jhkh1kh'],
            ['s3://foo/bar/trussels guide.pdf', 'bar'],
        ]
        test.each(validURLsAndKey)(
            'given %p as the potential url, returns %p for key',
            (firstArg, expectedResult) => {
                const result = parseKey(firstArg)
                expect(result).toEqual(expectedResult)
            }
        )

        test.each(invalidURLs)(
            'given %p as the potential url, returns error',
            (firstArg) => {
                const result = parseKey(firstArg)
                expect(result).toBeInstanceOf(Error)
            }
        )
    })
})
