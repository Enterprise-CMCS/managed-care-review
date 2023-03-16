import {
    formatEmailAddresses,
    isEmailAddress,
    includesEmailAddress,
    pruneDuplicateEmails,
} from './formatEmailAddresses'

describe('isEmailAddress', () => {
    const validEmails = ['foo@bar.com', 'foo_bar@bar.com', 'foo+bar@foo.com']

    const notEmails = [
        'foo@',
        'bar.com',
        'fubu__@',
        '"testfoo" <foo+bar@foo.com>',
    ]
    test.each(validEmails)(
        'given %s as a valid email, returns true',
        (firstArg) => {
            const result = isEmailAddress(firstArg)
            expect(result).toBe(true)
        }
    )

    test.each(notEmails)(
        'given %s which is not an email address, returns false',
        (firstArg) => {
            const result = isEmailAddress(firstArg)
            expect(result).toBe(false)
        }
    )
})

describe('includesEmails', () => {
    const includesEmails = [
        'foo@bar.com',
        'asdf <foo_bar@bar.com>',
        'foo+bar@foo.com, "sdfadsf" <bar@foo.com>',
        '"Test Foobar" <foo+bar@foo.com>',
    ]

    const noEmails = ['foo@', 'bar.com', 'fubu__@', 'adsfasdfdaf adsf']
    test.each(includesEmails)(
        'given %s as a valid string that includes email address, returns true',
        (firstArg) => {
            const result = includesEmailAddress(firstArg)
            expect(result).toBe(true)
        }
    )

    test.each(noEmails)(
        'given %s which does not include email addresses, returns false',
        (firstArg) => {
            const result = includesEmailAddress(firstArg)
            expect(result).toBe(false)
        }
    )
})

describe('formatEmailAddresses', () => {
    const sampleStrings = [
        ['"Foo Bar 1" <foo@bar.com>', 'foo@bar.com'],
        [
            '"Foo Bar 1" <foo@bar.com>, "Foo Bar 2" <foo_bar@bar.com>, "Foo Bar 3" <foo+bar@foo.com>',
            'foo@bar.com,foo_bar@bar.com,foo+bar@foo.com',
        ],
        ['foo@bar.com hellobar.com foo@ nothinng', 'foo@bar.com'],
        ['', ''],
        ['notanemail, email eamil @', ''],
    ]

    test.each(sampleStrings)(
        'given %s, returns %s which is a comma separated email string',
        (firstArg, expectedResult) => {
            const result = formatEmailAddresses(firstArg)
            expect(result).toEqual(expectedResult)
        }
    )
})

describe('pruneDuplicateEmails', () => {
    const sampleEmailLists = [
        [
            // multiple aliased email addresses that duplicate an email elsewhere on list are pruned
            [
                '"Foo Bar 1" <foo@bar.com>',
                'foo@bar.com',
                'bar@foo.com',
                'Bar@foo.com',
                'FoO@bar.com',
                '"Bar 1" <bar@foo.com>',
                '"Bar 2" <bar@foo.com>',
            ],
            ['foo@bar.com', 'bar@foo.com'],
        ],
        // multiple aliased email addresses that do not duplicate a raw email string elsewhere in list will remain
        // this is because there is not way to determine which to prefer
        [
            ['"Foo Bar 1" foo@bar.com', '"Foo Bar 2" <foo@bar.com>'],
            ['"Foo Bar 1" foo@bar.com', '"Foo Bar 2" <foo@bar.com>'],
        ],
        // simple email addresses that are duplicates due to casing are pruned and lowercase preferred
        [
            ['Foo@bar.com', 'Fo.b-r@bar.com', 'fo.b-r@bar.com', 'foo@bar.com'],
            ['Foo@bar.com', 'Fo.b-r@bar.com'],
        ],
        // simple email addresses that are not duplicates remain the same
        [
            ['Foo@bar.com', 'Fo.b-r@bar.com', 'foo@nothing.com'],
            ['Foo@bar.com', 'Fo.b-r@bar.com', 'foo@nothing.com'],
        ],
    ]

    test.each(sampleEmailLists)(
        'given %s, returns %s which is an array of strings',
        (firstArg, expectedResult) => {
            const result = pruneDuplicateEmails(firstArg)
            expect(result).toEqual(expectedResult)
        }
    )
})
