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
    Convert a Parameter Store string into a raw email address for user display

    Emails are stored in Parameter Store in a specific format - "RatesEmailGroup" <ratesemailgroup@example.com
    This format is used for AWS SES and is passed through the emailer via EmailConfiguration. However, this format is not user friendly.
    Email addresses we display to user can should be the raw email substring - e.g. ratesemailgroup@example.com
*/
const formatEmailAddress = (str: string) => {
    const emails = matchIncludesEmail(str)
    if (!emails) return ''
    return emails.join(',')
}

export { isEmailAddress, includesEmailAddress, formatEmailAddress }
