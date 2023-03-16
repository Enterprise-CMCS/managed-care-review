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
const isEmailAddress = (str: string) => Boolean(matchExactEmail(str))

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
    However, multiple aliased email addresses that do not replicate a raw email string elsewhere in list are allowed as duplicates because there is not way to determine which to prefer
    e.g. if FooBar@example.com and foobar@example.com are both in list, only foobar@example.com will remain after prune
    e.g. if "Foo Bar" <foobar@example> and foobar@example.com are both in the list, only foobar@example.com will remain after prune
    e.g. if "Foo Bar" <foobar@example> and "The best Foo Bar" <foobar@example> are both in the list, both remain after prune
*/
const pruneDuplicateEmails = (emails: string[]): string[] => {
    /* we'll use all-lowercase to compare, but return the original case
    when one address appears with mixed casing, we'll return the first one we find */
    const lowercasedEmails = emails.map((email) => email.toLowerCase())
    return emails.filter((email, index) => {
        const aliasedEmail = !isEmailAddress(email)
        const rawEmailAddress = formatEmailAddresses(email)
        if (
            aliasedEmail &&
            lowercasedEmails.indexOf(rawEmailAddress.toLowerCase()) !== -1
        ) {
            // aliased email address is also included elsewhere on list as a raw email, remove it
            lowercasedEmails.indexOf(rawEmailAddress.toLowerCase()) === index
        } else if (aliasedEmail) {
            // return unique aliased email address
            return lowercasedEmails.indexOf(email.toLowerCase()) === index
        } else {
            // return unique email address
            return lowercasedEmails.indexOf(email.toLowerCase()) === index
        }
    })
}

export {
    isEmailAddress,
    includesEmailAddress,
    formatEmailAddresses,
    pruneDuplicateEmails,
}
