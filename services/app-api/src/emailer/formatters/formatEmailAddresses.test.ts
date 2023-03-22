import {
    formatEmailAddresses,
    hasAlias,
    includesEmailAddress,
    pruneDuplicateEmails,
} from './formatEmailAddresses'

describe('hasAlias', () => {
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
            const result = !hasAlias(firstArg)
            expect(result).toBe(true)
        }
    )

    test.each(notEmails)(
        'given %s which is not an email address, returns false',
        (firstArg) => {
            const result = !hasAlias(firstArg)
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
            // multiple aliased email addresses: keep the first aliased version of each raw email address
            [
                '"Foo Bar 1" <foo@bar.com>',
                'foo@bar.com',
                'bar@foo.com',
                'Bar@foo.com',
                'FoO@bar.com',
                '"Bar 1" <bar@foo.com>',
                '"Bar 2" <bar@foo.com>',
            ],
            ['"Foo Bar 1" <foo@bar.com>', '"Bar 1" <bar@foo.com>'],
        ],
        // if there are multiple aliased emails, keep the first one
        [
            ['"Foo Bar 1" foo@bar.com', '"Foo Bar 2" <foo@bar.com>'],
            ['"Foo Bar 1" foo@bar.com'],
        ],
        // simple email addresses that are duplicates due to casing are pruned
        [
            ['Foo@bar.com', 'Fo.b-r@bar.com', 'fo.b-r@bar.com', 'foo@bar.com'],
            ['Foo@bar.com', 'Fo.b-r@bar.com'],
        ],
        // simple email addresses that are not duplicates remain the same
        [
            ['Foo@bar.com', 'Fo.b-r@bar.com', 'foo@nothing.com'],
            ['Foo@bar.com', 'Fo.b-r@bar.com', 'foo@nothing.com'],
        ],
        // ensure that changing the order of raw addresses in relation to aliased addresses doesn't make a difference
        [
            [
                'FOO@BAR.COM',
                '"Foo Bar 1" foo@bar.com',
                '"Foo Bar 2" <foo@bar.com>',
            ],
            ['"Foo Bar 1" foo@bar.com'],
        ],
        // changing the order of aliased email addresses with the same raw address in relation to *each other* _does_ make a difference
        [
            [
                '"Foo Bar 2" <foo@bar.com>',
                '"Foo Bar 1" foo@bar.com',
                'FOO@BAR.COM',
            ],
            ['"Foo Bar 2" <foo@bar.com>'],
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
