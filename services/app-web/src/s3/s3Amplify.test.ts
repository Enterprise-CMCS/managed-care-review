import { sanitizeFilename } from './s3Amplify'

describe('s3Amplify helpers', () => {
    describe('sanitizeFilename', () => {
        const cases = [
            [
                'remove unsafe and invalid input',
                '\u0000ssh/authorized_keys.pdf',
                'sshauthorized_keys.pdf',
            ],
            [
                'remove special characters from string except !()-_.',
                '123#@%$^&@456!-)+=*_.pdf',
                '123456!-)_.pdf',
            ],
            ['slugify filename', '  some filename.jpg  ', 'some-filename.jpg'],
            ['remove non-latin characters from string', 'áêīòüñ', ''],
            [
                'slugify file name with combination of unhandled characters and spaces',
                'some  漢字 ćööł %  #fíłéñàmé.jpg',
                'some-fm.jpg',
            ],
            [
                'trim and slugify file name with extra whitespace',
                '  some filename.jpg  ',
                'some-filename.jpg',
            ],
        ]

        test.each(cases)(
            'should %s',
            (description, testValue, expectedResult) => {
                expect(sanitizeFilename(testValue)).toEqual(expectedResult)
            }
        )
    })
})
