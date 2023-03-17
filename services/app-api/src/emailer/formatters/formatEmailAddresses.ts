// See http://emailregex.com for discussion of email validation

// check for email address anywhere in the string
const emailAddressRegex = /[a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi
const matchIncludesEmail = (str: string) => str.match(emailAddressRegex)
const includesEmailAddress = (str: string) => {
    return Boolean(matchIncludesEmail(str))
}

// checks that string literal is an email address
const emailAddressOnlyRegex =
    /^[a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/
const matchExactEmail = (str: string) => str.match(emailAddressOnlyRegex)
const hasAlias = (str: string) => !matchExactEmail(str)

/*
   Change parameter store string into a raw email address for user display

    Emails are stored in Parameter Store in a specific format - "RatesEmailGroup" <ratesemailgroup@example.com
    This format is used for AWS SES and is passed through the emailer via EmailConfiguration. However, this format is not user friendly.
    Email addresses we display to user can should be the raw email substring - e.g. ratesemailgroup@example.com
*/
const formatEmailAddresses = (str: string) => {
    const emails = matchIncludesEmail(str)
    if (!emails) return ''
    return emails.join(',')
}

/*  
    Remove duplicate emails from email string array

    This function will remove duplicate emails, including aliased emails that duplicate the same raw email string used elsewhere as a standalone entry
    If there are multiple aliased emails that duplicate the same raw email string, we'll keep only the first aliased email
    We prefer aliased emails over standalone emails because they make it easier to catch potential errors in our lower environments
    e.g. if FooBar@example.com and foobar@example.com are both in list, only one will remain
    e.g. if "Foo Bar" <foobar@example> and foobar@example.com are both in the list, only "Foo Bar" <foobar@example> will remain
    e.g. if "Foo Bar" <foobar@example> and "The best Foo Bar" <foobar@example> are both in the list, "Foo Bar" <foobar@example> will remain
*/
const pruneDuplicateEmails = (emails: string[]): string[] => {
    const uniqueEmails: { [key: string]: string } = {}
    emails.forEach((currentEmail: string) => {
        const rawEmail = formatEmailAddresses(currentEmail).toLowerCase()
        const emailInObject = uniqueEmails[rawEmail]
        /* ['Jane Johnson <jane@example.com>', 'jane@example.com', 'Bill Smith <BILL@example.com>']
        becomes
        {
            jane@example.com: 'Jane Johnson <jane@example.com>',
            bill@example.com: 'Bill Smith <bill@example.com>'
        }
        */
        if (
            emailInObject === undefined ||
            /* we prefer the aliased email */
            (!hasAlias(emailInObject) && hasAlias(currentEmail))
        ) {
            uniqueEmails[rawEmail] = currentEmail
        }
    })

    return Object.values(uniqueEmails)
}

export {
    hasAlias,
    includesEmailAddress,
    formatEmailAddresses,
    pruneDuplicateEmails,
}
