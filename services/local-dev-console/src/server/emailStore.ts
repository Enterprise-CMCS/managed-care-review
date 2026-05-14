type LocalEmail = {
    id: string
    createdAt: string
    sourceEmail: string
    subject: string
    toAddresses: string[]
    ccAddresses: string[]
    bccAddresses: string[]
    replyToAddresses: string[]
    bodyText: string
    bodyHTML?: string
}

type LocalEmailInput = {
    sourceEmail: string
    subject: string
    toAddresses?: string[]
    ccAddresses?: string[]
    bccAddresses?: string[]
    replyToAddresses?: string[]
    bodyText?: string
    bodyHTML?: string
}

const emails: LocalEmail[] = []
const MAX_EMAILS = 200

function list(): LocalEmail[] {
    return [...emails]
}

function clear(): void {
    emails.length = 0
}

function add(email: LocalEmailInput): LocalEmail {
    const storedEmail: LocalEmail = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date().toISOString(),
        sourceEmail: email.sourceEmail,
        subject: email.subject,
        toAddresses: email.toAddresses ?? [],
        ccAddresses: email.ccAddresses ?? [],
        bccAddresses: email.bccAddresses ?? [],
        replyToAddresses: email.replyToAddresses ?? [],
        bodyText: email.bodyText ?? '',
        bodyHTML: email.bodyHTML,
    }

    emails.unshift(storedEmail)
    if (emails.length > MAX_EMAILS) {
        emails.length = MAX_EMAILS
    }
    return storedEmail
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isLocalEmailInput(value: unknown): value is LocalEmailInput {
    if (!value || typeof value !== 'object') {
        return false
    }

    const email = value as Record<string, unknown>
    return (
        typeof email.sourceEmail === 'string' &&
        typeof email.subject === 'string' &&
        (email.bodyText === undefined || typeof email.bodyText === 'string') &&
        (email.bodyHTML === undefined || typeof email.bodyHTML === 'string') &&
        (email.toAddresses === undefined || isStringArray(email.toAddresses)) &&
        (email.ccAddresses === undefined || isStringArray(email.ccAddresses)) &&
        (email.bccAddresses === undefined || isStringArray(email.bccAddresses)) &&
        (email.replyToAddresses === undefined ||
            isStringArray(email.replyToAddresses))
    )
}

export { add, clear, isLocalEmailInput, list }
export type { LocalEmail, LocalEmailInput }
