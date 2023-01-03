import { formatEmailAddress, isEmailAddress, includesEmailAddress } from '.'

describe('isEmailAddress', () => {
    const validEmails = ['foo@bar.com', 'foo_bar@bar.com', 'foo+bar@foo.com']

    const notEmails = [
        'foo@',
        'bar.com',
        'fubu__@',
        '"testfoo" foo+bar@foo.com',
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
        'asdf foo_bar@bar.com',
        'foo+bar@foo.com asdfadsf bar@foo.com',
        '"Test Foobar", foo+bar@foo.com',
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

describe('formatEmailAddress', () => {
    const sampleStrings = [
        [
            '"Foo Bar 1" foo@bar.com, "Foo Bar 2" foo_bar@bar.com, "Foo Bar 3" foo+bar@foo.com',
            'foo@bar.com,foo_bar@bar.com,foo+bar@foo.com',
        ],
        ['foo@bar.com hellobar.com foo@ nothinng', 'foo@bar.com'],
        [
            ' "user name" username@email.com, "somethingelse", somethingelse@email.com',
            'username@email.com,somethingelse@email.com',
        ],
        ['', ''],
        ['notanemail, email eamil @', ''],
    ]

    test.each(sampleStrings)(
        'given %s, returns %s which is a comma separated email string',
        (firstArg, expectedResult) => {
            const result = formatEmailAddress(firstArg)
            expect(result).toEqual(expectedResult)
        }
    )
})
