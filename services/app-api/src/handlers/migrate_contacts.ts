import type { Handler } from 'aws-lambda'
import { parseErrorToError } from '@mc-review/helpers'
import { getPostgresURL } from './configuration'
import {
    NewPrismaClient,
    type ExtendedPrismaClient,
} from '../postgres/prismaClient'

/**
 * Splits the deprecated `name` value on StateContact and ActuaryContact rows
 * separate name fields.
 *
 *   aws lambda invoke --function-name app-api-{stage}-migrate-contacts \
 *     --payload '{"dryRun":true}' response.json
 *
 * It never overwrites name data that is already there, never touches `name`
 * itself, and hands anything it is unsure about to a person instead of
 * guessing. Only contacts on submitted revisions are looked at.
 *
 * This is the second of two passes: names that need a person are fixed by hand
 * with SQL first, then this picks up the rest. Full order of operations is in
 * contacts-manual-migration-runbook.md at the repository root.
 */

// Placeholders written when a name part genuinely does not exist in the source
// data. These are deliberately a single shared constant rather than a numbered
// series -- see the comment on countPlaceholders() for why that matters.
const NO_GIVEN_NAME = 'NO_GIVEN_NAME'
const NO_FAMILY_NAME = 'NO_FAMILY_NAME'
const NO_TITLE_ROLE = 'NO_TITLE_ROLE'

// How many updates run at once. The connection pool holds 10 (a node-postgres
// pool, built in prismaClient.ts), so 10 is the most that can be in flight and
// a higher number here would only queue.
const UPDATE_CONCURRENCY = 10

// Leading tokens treated as a title rather than part of the given name.
// Compared case-insensitively and with boundary punctuation removed, so "Dr."
// and "DR" both match, while the original spelling is what gets stored.
const PREFIXES = new Set(['DR', 'MR', 'MRS', 'MS'])

// Trailing tokens treated as a generational suffix rather than a family name.
const SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV'])

// Professional credentials that may appear anywhere in a name. The schema has
// no field for these, so they are moved into `suffix` rather than being left to
// corrupt the family name.
const PROFESSIONAL_CREDENTIALS = new Set([
    'ASA',
    'DMD',
    'FCA',
    'FSA',
    'FSS',
    'MAAA',
    'MD',
    'MPH',
    'MSA',
    'PHD',
])
// One VAL sanitizer split. A given and a family name are always present; the
// other parts are written out only when a name has them.
type ValNameSplit = Pick<ParsedName, 'givenName' | 'familyName'> &
    Partial<Omit<ParsedName, 'givenName' | 'familyName'>>

/**
 * Predefined names used in the Prod -> Val data dump and validator lambda. These
 * show up in VAL so handling the split them here instead of figuring our some
 * kind of complex matching rules.
 */
const VAL_SANITIZED_NAME_SPLITS = new Map<string, ValNameSplit>([
    [
        'Toph Jasmine Dragon',
        { givenName: 'Toph', middleName: 'Jasmine', familyName: 'Dragon' },
    ],
    [
        'Ty Lee Fire Lord',
        {
            givenName: 'Ty',
            middleName: 'Lee',
            familyName: 'Fire',
            suffix: 'Lord',
        },
    ],
    [
        'Ty Lee Omashu',
        { givenName: 'Ty', middleName: 'Lee', familyName: 'Omashu' },
    ],
    [
        'Ty Lee Earth Empire',
        {
            givenName: 'Ty',
            middleName: 'Lee',
            familyName: 'Earth',
            suffix: 'Empire',
        },
    ],
    [
        'Zuko Bei Fong',
        { givenName: 'Zuko', middleName: 'Bei', familyName: 'Fong' },
    ],
    [
        'Katara Fire Lord',
        { givenName: 'Katara', middleName: 'Fire', familyName: 'Lord' },
    ],
    [
        'Ty Lee Chief',
        { givenName: 'Ty', middleName: 'Lee', familyName: 'Chief' },
    ],
    [
        'Haru Fire Lord',
        { givenName: 'Haru', middleName: 'Fire', familyName: 'Lord' },
    ],
    [
        'Suki Metal Clan',
        { givenName: 'Suki', middleName: 'Metal', familyName: 'Clan' },
    ],
    [
        'Ty Lee Beifong',
        { givenName: 'Ty', middleName: 'Lee', familyName: 'Beifong' },
    ],
    [
        'Mai Fire Lord',
        { givenName: 'Mai', middleName: 'Fire', familyName: 'Lord' },
    ],
    [
        'Aang Ba Sing Se',
        {
            givenName: 'Aang',
            middleName: 'Ba',
            familyName: 'Sing',
            suffix: 'Se',
        },
    ],
    [
        'Zuko Kyoshi Warrior',
        { givenName: 'Zuko', middleName: 'Kyoshi', familyName: 'Warrior' },
    ],
    [
        'Azula Jasmine Dragon',
        { givenName: 'Azula', middleName: 'Jasmine', familyName: 'Dragon' },
    ],
    [
        'Haru Earth King',
        { givenName: 'Haru', middleName: 'Earth', familyName: 'King' },
    ],
    [
        'Suki Bei Fong',
        { givenName: 'Suki', middleName: 'Bei', familyName: 'Fong' },
    ],
    [
        'Toph Metal Clan',
        { givenName: 'Toph', middleName: 'Metal', familyName: 'Clan' },
    ],
    [
        'Iroh Kyoshi Warrior',
        { givenName: 'Iroh', middleName: 'Kyoshi', familyName: 'Warrior' },
    ],
    [
        'Toph Ba Sing Se',
        {
            givenName: 'Toph',
            middleName: 'Ba',
            familyName: 'Sing',
            suffix: 'Se',
        },
    ],
    [
        'Zuko Fire Lord',
        { givenName: 'Zuko', middleName: 'Fire', familyName: 'Lord' },
    ],
    [
        'Haru Kyoshi Warrior',
        { givenName: 'Haru', middleName: 'Kyoshi', familyName: 'Warrior' },
    ],
])

// The only columns this migration reads. Both contact tables share these, so
// one select shape serves both queries and keeps the two row types identical.
const CONTACT_SELECT = {
    id: true,
    name: true,
    prefix: true,
    givenName: true,
    middleName: true,
    familyName: true,
    suffix: true,
    titleRole: true,
    email: true,
} as const

// Which table(s) an invocation should process. `both` is the default.
export type ContactMigrationEntity =
    'stateContacts' | 'actuaryContacts' | 'both'

// The Lambda's event payload. Both fields are optional and both have safe
// defaults, so `{}` is a valid dry-run invocation.
export type MigrateContactsEvent = {
    entity?: ContactMigrationEntity
    /** Defaults to true so an empty invocation cannot mutate data. */
    dryRun?: boolean
}

// Tags a row with which table it came from, so one code path can handle both
// and still issue the update against the right table.
type ContactType = 'STATE_CONTACT' | 'ACTUARY_CONTACT'

// One contact as read from the database. Every column is nullable because the
// deprecated schema never required these fields to be populated.
type ContactRow = {
    contactType: ContactType
    id: string
    name: string | null
    prefix: string | null
    givenName: string | null
    middleName: string | null
    familyName: string | null
    suffix: string | null
    titleRole: string | null
    email: string | null
}

// The structured result of parsing one deprecated `name` value. `givenName` and
// `familyName` are non-nullable because a parse that cannot produce both is
// not a successful parse -- it falls back to a placeholder or a review reason.
export type ParsedName = {
    prefix: string | null
    givenName: string
    middleName: string | null
    familyName: string
    suffix: string | null
}

// Why a contact was not migrated automatically. The first six are decided
// before any write is attempted; the last two can only happen during a write.
export type ContactMigrationIssueReason =
    | 'AMBIGUOUS_MULTI_PART_NAME'
    | 'CONCURRENT_CHANGE_OR_DELETED'
    | 'MULTIPLE_PEOPLE_IN_NAME'
    | 'MULTIPLE_PEOPLE_IN_TITLE_ROLE'
    | 'NON_PERSON_OR_PLACEHOLDER_NAME'
    | 'STRUCTURED_NAME_CONFLICT'
    | 'UNSUPPORTED_NAME_FORMAT'
    | 'UPDATE_FAILED'

// One skipped or failed contact, carried back in the response so the row can
// be located and fixed by hand. `error` is only present for UPDATE_FAILED.
export type ContactMigrationIssue = {
    contactType: ContactType
    contactID: string
    reason: ContactMigrationIssueReason
    error?: string
}

// The per-table tally. `queried` is the denominator; every contact lands in
// exactly one of eligible / alreadyMigrated / manualReview / partiallyPopulated,
// and an eligible contact then becomes either migrated or failed.
export type ContactMigrationEntityResult = {
    queried: number
    eligible: number
    migrated: number
    alreadyMigrated: number
    manualReview: number
    partiallyPopulated: number
    failed: number
    /** Contacts stored with the `NO_GIVEN_NAME` placeholder. */
    placeholderGivenNames: number
    /** Contacts stored with the `NO_FAMILY_NAME` placeholder. */
    placeholderFamilyNames: number
    issues: ContactMigrationIssue[]
}

// What the Lambda returns. `totals` sums whichever tables ran; `results` holds
// the per-table breakdown, with a key present only for a table that ran.
export type MigrateContactsResponse = {
    success: boolean
    // True only when nothing is left for a person to do. This is a different
    // question from `success`, which asks whether every attempted write landed
    // and stays true even when rows were handed off. The runbook needs
    // manualReview === 0, so that answer is reported directly.
    complete: boolean
    dryRun: boolean
    entity: ContactMigrationEntity
    totals: ContactMigrationEntityResult
    results: {
        stateContacts?: ContactMigrationEntityResult
        actuaryContacts?: ContactMigrationEntityResult
    }
}

// What should happen to one contact. Shaped so the caller cannot read
// `parsedName` without first checking that the status is ELIGIBLE.
type ContactClassification =
    | { status: 'ALREADY_MIGRATED' }
    | { status: 'ELIGIBLE'; parsedName: ParsedName }
    | { status: 'MANUAL_REVIEW'; reason: ContactMigrationIssueReason }
    | {
          status: 'PARTIALLY_POPULATED'
          reason: ContactMigrationIssueReason
      }

// A contact that passed classification, paired with the values to write. The
// original row is kept because the update guards on every one of its columns.
type EligibleContact = {
    contact: ContactRow
    parsedName: ParsedName
}

/**
 * Makes the tidied-up copy used for parsing and comparing: no surrounding
 * spaces, runs of spaces squeezed to one, null treated as empty. The `name` in
 * the database is never changed.
 *
 * NFC matters more than it looks. An accented letter can be stored as one
 * character, or as a plain letter plus a separate accent mark -- identical on
 * screen, not equal in code -- so without it a name can miss its entry in the
 * lookup tables and mergeParsedName can read one name as two.
 */
function clean(value: string | null | undefined): string {
    return (value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')
}

// Words that make a titleRole segment a job title rather than a person's name.
// Drawn from the titleRole values actually present in the DEV, VAL, and PROD
// worklists, plus the credentials that show up beside actuary names. Only used
// to reject a segment, so a word missing here costs a manual review at worst.
const ROLE_WORDS = new Set([
    'actuarial',
    'actuaries',
    'actuary',
    'administrator',
    'alternate',
    'alternative',
    'analyst',
    'assistant',
    'associate',
    'attorney',
    'benefits',
    'bureau',
    'care',
    'chief',
    'chip',
    'compliance',
    'consultant',
    'consulting',
    'contact',
    'contract',
    'contracts',
    'coordinator',
    'data',
    'department',
    'deputy',
    'director',
    'division',
    'eligibility',
    'enrollment',
    'executive',
    'finance',
    'financing',
    'fiscal',
    'health',
    'integrated',
    'junior',
    'lead',
    'managed',
    'management',
    'manager',
    'managers',
    'medicaid',
    'medicare',
    'monitoring',
    'office',
    'officer',
    'operations',
    'oversight',
    'policy',
    'president',
    'primary',
    'principal',
    'principals',
    'program',
    'programs',
    'quality',
    'reporting',
    'reviewer',
    'secondary',
    'secretary',
    'section',
    'senior',
    'services',
    'specialist',
    'staff',
    'state',
    'strategy',
    'supervisor',
    'team',
    'test',
    'tester',
    'title',
    'unit',
    'vice',
    // credentials
    'acas',
    'asa',
    'cpa',
    'fsa',
    'jd',
    'maaa',
    'mba',
    'md',
    'phd',
    'rn',
])

/**
 * True when a titleRole holds two people instead of a job title. Splits on
 * `&`, `=` and the word `and`, then counts how many pieces read as a person
 * name: two or three tokens, each starting with a capital and made only of
 * name characters, and none of them a role word. Two such pieces is the bar,
 * which is what keeps `Jane Doe & John Doe = Principals` apart from the real
 * job title `Medicaid Contracts and Monitoring Analyst`.
 *
 * Deliberately strict, because a false negative just leaves today's behaviour
 * while a false positive sends a good row to a human for no reason.
 */
export function holdsTwoPersonNames(titleRole: string): boolean {
    const segments = titleRole
        .split(/\s*(?:&|=)\s*|(?:^|\s)and(?:\s|$)/iu)
        .map((segment) => (segment ?? '').trim())
        .filter(Boolean)
    if (segments.length < 2) return false

    const readsAsPersonName = (segment: string): boolean => {
        const tokens = segment.split(/\s+/).filter(Boolean)
        if (tokens.length < 2 || tokens.length > 3) return false
        return tokens.every(
            (token) =>
                /^[\p{Lu}][\p{L}'’.-]*$/u.test(token) &&
                !ROLE_WORDS.has(token.toLowerCase().replace(/[.'’-]/g, ''))
        )
    }

    return segments.filter(readsAsPersonName).length >= 2
}

/**
 * True when a name field already holds something. Unlike `hasRequiredValue`
 * below, this does not call `clean()`, so a value of " " counts as present.
 * That is on purpose: it makes `mergeParsedName` leave odd existing data alone
 * rather than quietly replacing it.
 */
function hasValue(value: string | null): value is string {
    return value !== null && value !== ''
}

/**
 * True when a required field has real content, using the same tidy-up the
 * parser uses. For `givenName`, `familyName` and `titleRole`.
 */
function hasRequiredValue(value: string | null): boolean {
    // Unlike hasValue, this treats a whitespace-only value as missing, because
    // a field of ' ' does not satisfy the requirement the new schema imposes.
    return clean(value) !== ''
}

/**
 * Makes the lookup key for prefixes, suffixes, credentials and known titles.
 * Uppercases and drops punctuation at the two ends only, so "Dr.", ",MAAA" and
 * "(Jr)" become DR, MAAA and JR while "J.R." keeps its periods. The word is
 * written out in its original spelling; this key is only for lookups.
 */
function normalizedToken(value: string): string {
    return clean(value)
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
        .toUpperCase()
}

/**
 * Like `normalizedToken`, but also drops periods so "M.D." and "MD" match the
 * same entry. Used only for credentials. Prefixes and suffixes must keep their
 * periods, or the initials "J.R." would turn into the suffix "Jr".
 */
function credentialToken(value: string): string {
    return normalizedToken(value).replace(/\./g, '')
}

/**
 * Drops the commas that were only separating a prefix, suffix or credential
 * from the rest, keeping its original spelling, case and periods.
 */
function outputAffix(value: string): string {
    // Only commas are removed, and only at the boundaries. Periods survive, so
    // "Jr." is stored as "Jr." while "Smith, Jr." contributes just "Jr.".
    return value.replace(/^,+|,+$/g, '')
}

/**
 * Matches emoji, plus the invisible characters that join them together and the
 * ones that make up flags and skin tones.
 *
 * This only ever asks questions about a word; it never edits a name. Keeping it
 * this narrow is a safety measure. A wider match such as \p{S} would also cover
 * `=`, so `Bob = Smith` would look like a name with a middle initial and get
 * migrated automatically instead of going to a person. \p{Emoji} is wrong too
 * -- it matches digits, `#` and `*`.
 *
 * WebStorm flags \p{Extended_Pictographic} as an unknown category. That is an
 * IDE gap; it is valid and compiles clean here.
 */
const EMOJI_RUN =
    /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200D\uFE0F\u{1F1E6}-\u{1F1FF}]+/gu

/**
 * The name text a token would have with its emoji removed.
 *
 * Emoji are never moved off the token they were typed on -- "Cena💻🖥️" is
 * stored in `familyName` exactly as written. This is only used to decide
 * *about* a token: whether it carries any name text at all, and whether the
 * letters around the emoji are a shape the parser will split automatically.
 */
function nameCore(value: string): string {
    // `replace` is used rather than a `test` guard because EMOJI_RUN is a
    // global regex: `test` would advance its lastIndex and return alternating
    // results across calls, while `replace` resets it.
    return clean(value.replace(EMOJI_RUN, ''))
}

/**
 * True when a word is only emoji. It has no name text to ride along with, so
 * where it goes is decided by its position.
 */
function isEmojiOnly(value: string): boolean {
    return nameCore(value) === ''
}

/**
 * `isNameToken` for words that may carry emoji. Emoji are fine anywhere, so
 * only the letters around them decide whether the name can be split
 * automatically. Emoji-only words pass, since position already placed them.
 */
function isNameTokenWithEmoji(value: string): boolean {
    if (isEmojiOnly(value)) {
        return true
    }

    return isNameToken(nameCore(value))
}

/**
 * Restricts automatically migrated name parts to Unicode letters/marks with
 * supported apostrophes or hyphens, an optional terminal period, or compound
 * initials such as `J.R.`. Other punctuation and symbols require review.
 */
function isNameToken(value: string): boolean {
    // The whole word has to match one of two shapes:
    //   1. letters, which may be joined by an apostrophe or a hyphen and may
    //      end in one period -- "O'Brien", "Smith-Jones", "J."
    //   2. two or more letter-and-period pairs -- "J.R."
    // Anything else, such as digits, slashes or parentheses, goes to a person
    // instead of being guessed at.
    return /^(?:[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*\.?|(?:[\p{L}\p{M}]\.){2,})$/u.test(
        value
    )
}

/**
 * True for a one-letter name part, used by the three-part rule. The trailing
 * period is already gone, so "J" and "J." both count, while "J.R." is length 3
 * and does not.
 */
function isInitial(value: string): boolean {
    return normalizedToken(value).length === 1
}

/**
 * Catches names that clearly need a person, before any splitting is tried.
 * Returns undefined when nothing looks wrong.
 */
function knownManualNameReason(
    normalizedName: string
): ContactMigrationIssueReason | undefined {
    // Two or more people entered in one field: the word "and" on word
    // boundaries, a standalone "&" surrounded by spaces or at either end, or a
    // semicolon or slash used as a separator. Picking which person is the
    // primary contact is a product decision, not a parsing one.
    if (/\b(?:and)\b|(?:^|\s)&(?:\s|$)|[;/]/iu.test(normalizedName)) {
        return 'MULTIPLE_PEOPLE_IN_NAME'
    }

    // An email address pasted into the name field, or a parenthesized aside
    // such as "Jane Doe (interim)". Both need a human to decide what the actual
    // name is.
    if (normalizedName.includes('@') || /[()]/u.test(normalizedName)) {
        return 'UNSUPPORTED_NAME_FORMAT'
    }

    // Companies and shared inboxes rather than people. These rarely hold a real
    // person's name.
    //
    // The bare filler word "Name" is deliberately not caught here. It goes
    // through the ordinary one-part rule instead, so the value the user typed is
    // kept as the `givenName` and `familyName` takes its placeholder. Sending it
    // to review bought nothing: a reviewer has no more information than the
    // parser does, and the row still has to end up somewhere.
    if (/\b(?:ACTUARIES|INBOX|LLC|MERCER)\b/iu.test(normalizedName)) {
        return 'NON_PERSON_OR_PLACEHOLDER_NAME'
    }

    return undefined
}

/**
 * The pieces of a name while it is being taken apart. `tokens` holds the words
 * still in play, each tagged with where it was in the original name so the
 * suffix can be put back in the order it was written.
 */
type NameInProgress = {
    tokens: Array<{ index: number; value: string }>
    prefix: string | null
    suffixParts: Array<{ index: number; value: string }>
    leadingEmoji: string
}

/** Splits a name into words, tagging each with its original position. */
function splitIntoTokens(normalizedName: string): NameInProgress {
    return {
        tokens: normalizedName
            .split(/\s+/)
            .map((value, index) => ({ index, value })),
        prefix: null,
        suffixParts: [],
        leadingEmoji: '',
    }
}

/**
 * Places words that are only emoji, which have no name text to sit beside.
 * Ones at the front are held back for the prefix or given name; ones at the end
 * go to the suffix. Emoji attached to a real word are left alone.
 */
function takeStandaloneEmoji(parts: NameInProgress): void {
    while (parts.tokens.length > 0 && isEmojiOnly(parts.tokens[0].value)) {
        const token = parts.tokens.shift()!
        parts.leadingEmoji =
            parts.leadingEmoji === ''
                ? token.value
                : `${parts.leadingEmoji} ${token.value}`
    }

    // Stops at one remaining word so a name of pure emoji is not split between
    // the given name and the suffix.
    while (
        parts.tokens.length > 1 &&
        isEmojiOnly(parts.tokens[parts.tokens.length - 1].value)
    ) {
        const token = parts.tokens.pop()!
        parts.suffixParts.push({ index: token.index, value: token.value })
    }
}

/**
 * Takes a title such as "Dr." off the front. A name that is only "Dr" keeps it
 * as the given name instead of ending up with no name at all.
 */
function takePrefix(parts: NameInProgress): void {
    if (
        parts.tokens.length <= 1 ||
        !PREFIXES.has(normalizedToken(parts.tokens[0].value))
    ) {
        return
    }

    parts.prefix = outputAffix(parts.tokens.shift()!.value)

    // The prefix is now the front of the name, so a leading emoji joins it
    // here rather than the given name.
    if (parts.leadingEmoji !== '') {
        parts.prefix = `${parts.leadingEmoji} ${parts.prefix}`
        parts.leadingEmoji = ''
    }
}

/**
 * Moves credentials such as "MAAA" or "M.D." into the suffix. They have no
 * field of their own, and leaving them in would corrupt the family name.
 */
function takeCredentials(parts: NameInProgress): void {
    parts.tokens = parts.tokens.filter((token, position) => {
        if (!PROFESSIONAL_CREDENTIALS.has(credentialToken(token.value))) {
            return true
        }

        // "Md" is a common short form of Mohammed and is a given name, so
        // "Md Rahman" is Rahman's first name. Credentials always come after a
        // name, so a leading MD is kept as one. Only MD needs this.
        if (position === 0 && credentialToken(token.value) === 'MD') {
            return true
        }

        parts.suffixParts.push({
            index: token.index,
            value: outputAffix(token.value),
        })
        return false
    })
}

/**
 * Takes "Jr.", "III" and the like off the end. Same guard as the prefix: a
 * name that is only "II" keeps it as the given name.
 */
function takeGenerationalSuffix(parts: NameInProgress): void {
    if (
        parts.tokens.length <= 1 ||
        !SUFFIXES.has(
            normalizedToken(parts.tokens[parts.tokens.length - 1].value)
        )
    ) {
        return
    }

    const recognized = parts.tokens.pop()!
    parts.suffixParts.push({
        index: recognized.index,
        value: outputAffix(recognized.value),
    })
}

/**
 * Joins everything bound for the suffix back into written order, so
 * "Jane Doe MAAA Jr." stores "MAAA Jr." and not "Jr. MAAA".
 */
function joinSuffix(
    suffixParts: Array<{ index: number; value: string }>
): string | null {
    if (suffixParts.length === 0) {
        return null
    }

    return suffixParts
        .sort((a, b) => a.index - b.index)
        .map((part) => part.value)
        .join(' ')
}

/**
 * Decides which field each remaining word belongs to. Only counts the parser
 * can be sure about are split; anything else goes to a person.
 */
function assignFields(
    tokens: string[],
    prefix: string | null,
    suffix: string | null
): { parsedName: ParsedName } | { reason: ContactMigrationIssueReason } {
    // One word could be either a given or a family name, so the family name
    // gets its placeholder rather than a guess.
    if (tokens.length === 1) {
        return {
            parsedName: {
                prefix,
                givenName: tokens[0],
                middleName: null,
                familyName: NO_FAMILY_NAME,
                suffix,
            },
        }
    }

    if (tokens.length === 2) {
        return {
            parsedName: {
                prefix,
                givenName: tokens[0],
                middleName: null,
                familyName: tokens[1],
                suffix,
            },
        }
    }

    // Three words are split only when exactly one is a single initial or a
    // lone emoji, as in "Jane Q. Doe". That one can only be the middle name,
    // which fixes the other two. "Maria Del Rosario" stays ambiguous.
    if (
        tokens.length === 3 &&
        tokens.filter((token) => isInitial(token) || isEmojiOnly(token))
            .length === 1
    ) {
        return {
            parsedName: {
                prefix,
                givenName: tokens[0],
                middleName: tokens[1],
                familyName: tokens[2],
                suffix,
            },
        }
    }

    return { reason: 'AMBIGUOUS_MULTI_PART_NAME' }
}

/**
 * Turns what is left after the affixes are removed into a finished name.
 */
function buildName(
    parts: NameInProgress
): { parsedName: ParsedName } | { reason: ContactMigrationIssueReason } {
    const tokens = parts.tokens.map((token) => token.value)
    const suffix = joinSuffix(parts.suffixParts)

    // A comma right before a suffix or credential is only a separator.
    if (suffix !== null) {
        const last = tokens[tokens.length - 1]
        if (last?.endsWith(',')) {
            tokens[tokens.length - 1] = last.slice(0, -1)
        }
    }

    // A name of nothing but emoji leaves no words behind. It still migrates:
    // the emoji become the given name.
    if (tokens.length === 0 && parts.leadingEmoji !== '') {
        return {
            parsedName: {
                prefix: parts.prefix,
                givenName: parts.leadingEmoji,
                middleName: null,
                familyName: NO_FAMILY_NAME,
                suffix,
            },
        }
    }

    // Nothing usable, or a word holding characters the parser will not guess
    // at. Either way a person decides.
    if (
        tokens.length === 0 ||
        tokens.some((token) => !isNameTokenWithEmoji(token))
    ) {
        return { reason: 'UNSUPPORTED_NAME_FORMAT' }
    }

    // Any leading emoji the prefix did not take joins the given name. Done
    // after the checks above so the space it adds cannot fail them.
    if (parts.leadingEmoji !== '') {
        tokens[0] = `${parts.leadingEmoji} ${tokens[0]}`
    }

    return assignFields(tokens, parts.prefix, suffix)
}

/**
 * Splits one deprecated `name` value into structured name fields.
 *
 * Only the shapes below are split automatically, because a wrong guess writes
 * a wrong name into the database:
 *
 *   ""                -> both required fields get their placeholder
 *   "Doe"             -> givenName; familyName gets its placeholder
 *   "Jane Doe"        -> givenName, familyName
 *   "Jane Q Doe"      -> givenName, middleName, familyName, but only when
 *                        exactly one of the three words is a single letter
 *   "J.R. Ewing"      -> the joined initials stay whole as the givenName
 *
 * A recognized title ("Dr."), generational suffix ("Jr.") and professional
 * credentials ("MAAA", "M.D.") are taken out and stored separately before the
 * words are counted, so "Dr. Jane Doe MAAA Jr." still counts as two words.
 * Emoji stay on the word they were typed on, and a value made only of emoji
 * becomes the givenName as it stands. The names the VAL sanitizer invents are
 * matched whole against a fixed table, since there is no way to work out where
 * a made-up name breaks.
 *
 * Anything else comes back as a reason for someone to handle by hand: three or
 * more plain words, two people in one value, an email address, an
 * organization.
 *
 * The stored `name` is never changed. All work happens on a cleaned copy.
 */
export function parseContactName(
    name: string | null
): { parsedName: ParsedName } | { reason: ContactMigrationIssueReason } {
    // The stored `name` is never changed; all work happens on this copy.
    const normalizedName = clean(name)

    // A blank name is not an error. Both required fields get their
    // placeholders and the contact still migrates.
    if (normalizedName === '') {
        return {
            parsedName: {
                prefix: null,
                givenName: NO_GIVEN_NAME,
                middleName: null,
                familyName: NO_FAMILY_NAME,
                suffix: null,
            },
        }
    }

    // Val has a set of predefined names used for sanitization when loading prod
    // data into VAL. This is to handle these predefined names for migration rather
    // than relying on matching logic.
    const sanitizedSplit = VAL_SANITIZED_NAME_SPLITS.get(normalizedName)
    if (sanitizedSplit) {
        // Built fresh so the table's own object is never handed out.
        return {
            parsedName: {
                prefix: sanitizedSplit.prefix ?? null,
                givenName: sanitizedSplit.givenName,
                middleName: sanitizedSplit.middleName ?? null,
                familyName: sanitizedSplit.familyName,
                suffix: sanitizedSplit.suffix ?? null,
            },
        }
    }

    // Shapes that always need a person.
    const manualReason = knownManualNameReason(normalizedName)
    if (manualReason) {
        return { reason: manualReason }
    }

    // Each step takes out the words it recognizes and files them under a
    // field, so whatever is left over is plain name text for buildName to
    // place. The order matters: emoji come out before the prefix so a leading
    // emoji can join it, and credentials come out before "Jr." because only
    // the last word is checked -- taking "MAAA" out of "Jane Doe Jr. MAAA"
    // puts "Jr." back on the end where it can be found.
    const parts = splitIntoTokens(normalizedName)
    takeStandaloneEmoji(parts)
    takePrefix(parts)
    takeCredentials(parts)
    takeGenerationalSuffix(parts)

    return buildName(parts)
}

/**
 * Merges a parsed name with structured values already stored on a contact.
 * Empty fields are filled from the parser and matching or supplemental values
 * are preserved. A disagreement between two meaningful values is returned as
 * a conflict so the migration never guesses which source is authoritative.
 */
function mergeParsedName(
    contact: ContactRow,
    parsedName: ParsedName
): { parsedName: ParsedName } | { reason: 'STRUCTURED_NAME_CONFLICT' } {
    // Start from the parsed values, then let existing stored data override.
    const mergedName: Record<keyof ParsedName, string | null> = {
        ...parsedName,
    }

    // Iterated in mergeParsedName so every structured field gets the same
    // preserve-existing-data treatment.
    const STRUCTURED_NAME_FIELDS: Array<keyof ParsedName> = [
        'prefix',
        'givenName',
        'middleName',
        'familyName',
        'suffix',
    ]

    // Walk the fields one at a time. Each one ends in exactly one of three
    // ways: nothing is stored, so the parsed value stands; something is stored
    // that the parser does not contradict, so the stored value wins; or both
    // hold real values that differ, which stops the whole contact here rather
    // than picking a winner. Stored data is never overwritten either way.
    for (const field of STRUCTURED_NAME_FIELDS) {
        const existingValue = contact[field]
        const parsedValue = parsedName[field]

        // Nothing stored for this field, so the parsed value stands.
        if (!hasValue(existingValue)) {
            continue
        }

        // Keep what is stored when there is nothing to disagree with: the
        // parser found nothing, found only a placeholder, or found the same
        // thing once spacing is tidied up.
        if (
            parsedValue === null ||
            parsedValue === NO_GIVEN_NAME ||
            parsedValue === NO_FAMILY_NAME ||
            clean(existingValue) === clean(parsedValue)
        ) {
            mergedName[field] = existingValue
            continue
        }

        // Two meaningful values that genuinely differ. Rather than pick one,
        // hand the whole contact to manual review.
        return { reason: 'STRUCTURED_NAME_CONFLICT' }
    }

    // Every field is now either parsed or preserved, so both required parts are
    // populated and the cast back to ParsedName is safe.
    return { parsedName: mergedName as ParsedName }
}

/**
 * Decides what should happen to one contact. Reads only; writes nothing.
 *
 * The order of the checks matters, so nothing already filled in gets
 * overwritten: already-migrated contacts are recognized first, then ones
 * needing only a `titleRole` placeholder, then names that need a person, then
 * the ones this can split itself. Email is outside this migration's scope and
 * never affects classification.
 *
 * An `ELIGIBLE` result carries the values to write. Every other result says
 * why the contact is left alone.
 */
export function classifyContact(contact: ContactRow): ContactClassification {
    const hasGivenName = hasRequiredValue(contact.givenName)
    const hasFamilyName = hasRequiredValue(contact.familyName)

    // Everything this migration is responsible for is already present. Email
    // is deliberately ignored and left exactly as stored.
    const fullyPopulated =
        hasGivenName && hasFamilyName && hasRequiredValue(contact.titleRole)

    // check if already populated
    if (fullyPopulated) {
        return { status: 'ALREADY_MIGRATED' }
    }

    // The name is complete but titleRole is missing. Do not re-parse `name` --
    // the stored name parts are authoritative. Passing them straight through
    // means the only change the update makes is the missing titleRole
    // placeholder.
    if (hasGivenName && hasFamilyName) {
        return {
            status: 'ELIGIBLE',
            parsedName: {
                prefix: contact.prefix,
                givenName: contact.givenName!,
                middleName: contact.middleName,
                familyName: contact.familyName!,
                suffix: contact.suffix,
            },
        }
    }

    // From here the name has to be derived from the deprecated `name` value.
    const normalizedName = clean(contact.name)
    const nameTokens = normalizedName.split(/\s+/).filter(Boolean)
    const normalizedTitleRole = clean(contact.titleRole)

    // Two people on one row, which shows up in two different shapes:
    //
    //   1. a one-word name, usually a firm, beside a titleRole joined by `&`
    //      or `=` -- `Mercer` / `Jane Doe & John Roe = Principals`
    //   2. a titleRole that is two names joined by `&`, `=` or `and`, whatever
    //      the name column holds -- `Acme Consulting` / `Jane Doe & John Roe`
    //
    // Checking only for shape 1 let shape 2 through as ELIGIBLE, which would
    // have left the second person with no row at all. Known VAL sanitizer
    // names are exact first/family pairs and skip both checks.
    if (
        !VAL_SANITIZED_NAME_SPLITS.has(normalizedName) &&
        ((nameTokens.length === 1 &&
            /(?:^|\s)&(?:\s|$)|=/u.test(normalizedTitleRole)) ||
            holdsTwoPersonNames(normalizedTitleRole))
    ) {
        return {
            status: 'MANUAL_REVIEW',
            reason: 'MULTIPLE_PEOPLE_IN_TITLE_ROLE',
        }
    }

    // Exactly one of the two required name parts is present. This does not
    // decide the outcome on its own -- it only changes which bucket the
    // failures below are counted in, since a half-populated row is a different
    // kind of problem from an untouched one.
    const partiallyPopulated = hasGivenName !== hasFamilyName

    // Only rows the manual pass left behind reach this far, so a clean run
    // produces no reasons below. The shapes that parse are listed on
    // parseContactName.
    const parsed = parseContactName(contact.name)
    if ('reason' in parsed) {
        // Same reason either way; only the bucket it is counted in differs.
        return partiallyPopulated
            ? { status: 'PARTIALLY_POPULATED', reason: parsed.reason }
            : { status: 'MANUAL_REVIEW', reason: parsed.reason }
    }

    // The parse succeeded, but any structured value already on the row wins.
    const merged = mergeParsedName(contact, parsed.parsedName)
    if ('reason' in merged) {
        return partiallyPopulated
            ? { status: 'PARTIALLY_POPULATED', reason: merged.reason }
            : { status: 'MANUAL_REVIEW', reason: merged.reason }
    }

    return { status: 'ELIGIBLE', parsedName: merged.parsedName }
}

/**
 * A zeroed tally. Used both per table and as the starting point for the totals.
 */
function emptyResult(): ContactMigrationEntityResult {
    return {
        queried: 0,
        eligible: 0,
        migrated: 0,
        alreadyMigrated: 0,
        manualReview: 0,
        partiallyPopulated: 0,
        failed: 0,
        placeholderGivenNames: 0,
        placeholderFamilyNames: 0,
        issues: [],
    }
}

/**
 * Builds one issue record. Only the contact's type and id go in, never its
 * name or email, so the response is safe to log to CloudWatch.
 */
function issueFor(
    contact: ContactRow,
    reason: ContactMigrationIssueReason,
    error?: string
): ContactMigrationIssue {
    return {
        contactType: contact.contactType,
        contactID: contact.id,
        reason,
        // Only add the key when there is an error, so the field stays absent
        // rather than explicitly undefined in the JSON response.
        ...(error ? { error } : {}),
    }
}

/**
 * Counts contacts that will be saved with a placeholder name.
 *
 * The placeholder is the same string every time, not a numbered series.
 * Contacts are saved per revision, so one person is already many rows, and a
 * shared `NO_FAMILY_NAME` lets other systems fold those rows together on the
 * same key they use for everyone else. Numbering them would break that.
 */
function countPlaceholders(
    eligibleContacts: EligibleContact[],
    result: ContactMigrationEntityResult
): void {
    // Counted before the writes so the numbers are reported identically on a
    // dry run and on a real run.
    for (const { parsedName } of eligibleContacts) {
        if (parsedName.givenName === NO_GIVEN_NAME) {
            result.placeholderGivenNames++
        }

        if (parsedName.familyName === NO_FAMILY_NAME) {
            result.placeholderFamilyNames++
        }
    }
}

/**
 * Reads every state contact attached to a submitted contract revision.
 * Unsubmitted revisions are excluded because their contacts can still be
 * edited by the user, so migrating them would fight with in-progress work.
 */
async function findSubmittedStateContacts(
    client: ExtendedPrismaClient
): Promise<ContactRow[]> {
    const contacts = await client.stateContact.findMany({
        where: {
            contractRevision: {
                is: {
                    // A non-null submitInfoID is what marks a revision as
                    // submitted.
                    submitInfoID: {
                        not: null,
                    },
                },
            },
        },
        // Stable ordering so two runs process rows in the same sequence.
        orderBy: {
            id: 'asc',
        },
        select: CONTACT_SELECT,
    })

    // Tag each row with its table so downstream code can update the right one.
    return contacts.map((contact) => ({
        contactType: 'STATE_CONTACT',
        ...contact,
    }))
}

/**
 * Reads every actuary contact attached to a submitted rate revision, across
 * both the certifying and additional actuary relationships.
 */
async function findSubmittedActuaryContacts(
    client: ExtendedPrismaClient
): Promise<ContactRow[]> {
    // Query through RateRevisionTable so both actuary roles are selected from
    // the same submitted-revision condition. This avoids role-specific query
    // behavior and mirrors the local investigation report.
    const rateRevisions = await client.rateRevisionTable.findMany({
        where: {
            submitInfoID: {
                not: null,
            },
        },
        orderBy: {
            id: 'asc',
        },
        select: {
            certifyingActuaryContacts: {
                orderBy: {
                    position: 'asc',
                },
                select: CONTACT_SELECT,
            },
            addtlActuaryContacts: {
                orderBy: {
                    position: 'asc',
                },
                select: CONTACT_SELECT,
            },
        },
    })

    // Collect into a map keyed by id. A contact reachable through more than one
    // relationship must only be migrated once, or the second update would find
    // the row already changed and be reported as a concurrent change.
    const contactsByID = new Map<string, ContactRow>()
    for (const revision of rateRevisions) {
        for (const contact of [
            ...revision.certifyingActuaryContacts,
            ...revision.addtlActuaryContacts,
        ]) {
            contactsByID.set(contact.id, {
                contactType: 'ACTUARY_CONTACT',
                ...contact,
            })
        }
    }

    // Sort by id so the ordering matches the state contact query, since map
    // insertion order follows the revisions rather than the contact ids.
    return [...contactsByID.values()].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Writes one contact's structured name. Returns the number of rows updated,
 * which the caller checks: 1 means success, 0 means the row changed or was
 * deleted since it was read.
 */
async function updateContact(
    client: ExtendedPrismaClient,
    eligibleContact: EligibleContact
): Promise<number> {
    const { contact, parsedName } = eligibleContact

    // Match on the id plus every original value, so a row edited since the
    // read simply will not match.
    const where = {
        id: contact.id,
        name: contact.name,
        prefix: contact.prefix,
        givenName: contact.givenName,
        middleName: contact.middleName,
        familyName: contact.familyName,
        suffix: contact.suffix,
        titleRole: contact.titleRole,
        email: contact.email,
    }

    const data = {
        // Note that `name` is absent from `data`. The deprecated column is read but
        // never written, so the original `name` value stays recoverable.
        // The structured name parts, already merged with anything that was
        // stored on the row.
        prefix: parsedName.prefix,
        givenName: parsedName.givenName,
        middleName: parsedName.middleName,
        familyName: parsedName.familyName,
        suffix: parsedName.suffix,
        // titleRole is required by the new schema but is not derived from the
        // name. Keep whatever is there, and only substitute a placeholder when
        // the field is genuinely empty. Email is intentionally absent from
        // `data`, so null, empty and nonblank values all remain untouched.
        titleRole: hasRequiredValue(contact.titleRole)
            ? contact.titleRole
            : NO_TITLE_ROLE,
    }

    // updateMany rather than update, because update throws when nothing matches
    // while updateMany reports a count of 0 -- which is exactly the concurrent
    // change signal this needs.
    if (contact.contactType === 'STATE_CONTACT') {
        const update = await client.stateContact.updateMany({ where, data })
        return update.count
    } else {
        const update = await client.actuaryContact.updateMany({ where, data })
        return update.count
    }
}

/**
 * Classifies and then migrates one table's worth of contacts.
 *
 * Classification runs over every row first and the writes happen afterwards, so
 * a dry run and a real run report identical classification numbers.
 */
async function migrateContactRows(
    client: ExtendedPrismaClient,
    contacts: ContactRow[],
    dryRun: boolean
): Promise<ContactMigrationEntityResult> {
    const result = emptyResult()
    result.queried = contacts.length
    const eligibleContacts: EligibleContact[] = []

    // Pass one: decide what happens to each contact. No writes here.
    for (const contact of contacts) {
        const classification = classifyContact(contact)

        switch (classification.status) {
            case 'ALREADY_MIGRATED':
                // Nothing to do; counted so the totals still add up.
                result.alreadyMigrated++
                break
            case 'PARTIALLY_POPULATED':
                // Half a name already stored and the rest could not be derived.
                result.partiallyPopulated++
                result.issues.push(issueFor(contact, classification.reason))
                break
            case 'MANUAL_REVIEW':
                // Needs a human; reported so it can be found and fixed by SQL.
                result.manualReview++
                result.issues.push(issueFor(contact, classification.reason))
                break
            case 'ELIGIBLE':
                // Queued for pass two, along with the values to write.
                result.eligible++
                eligibleContacts.push({
                    contact,
                    parsedName: classification.parsedName,
                })
                break
        }
    }

    // Counted whether or not the writes happen, so a dry run shows exactly
    // how many placeholders a real run would store.
    countPlaceholders(eligibleContacts, result)

    // A dry run stops here, having touched nothing.
    if (dryRun) {
        return result
    }

    // Pass two: write the eligible contacts, UPDATE_CONCURRENCY at a time.
    for (
        let index = 0;
        index < eligibleContacts.length;
        index += UPDATE_CONCURRENCY
    ) {
        const batch = eligibleContacts.slice(index, index + UPDATE_CONCURRENCY)

        // allSettled rather than all, so one failing update does not abandon
        // the rest of the batch. Each row is independent.
        const updates = await Promise.allSettled(
            batch.map((eligibleContact) =>
                updateContact(client, eligibleContact)
            )
        )

        updates.forEach((update, updateIndex) => {
            // allSettled preserves input order, so index updateIndex in the
            // results corresponds to the same index in the batch.
            const contact = batch[updateIndex].contact

            if (update.status === 'rejected') {
                // The query itself threw -- a constraint violation, a lost
                // connection, and so on. Record the message for diagnosis.
                result.failed++
                result.issues.push(
                    issueFor(
                        contact,
                        'UPDATE_FAILED',
                        parseErrorToError(update.reason).message
                    )
                )
            } else if (update.value !== 1) {
                // The query succeeded but matched no row, which means the
                // `where` guard rejected it: the contact was edited or deleted
                // between the read and the write. Not an error, but the row was
                // not migrated and needs another pass.
                result.failed++
                result.issues.push(
                    issueFor(contact, 'CONCURRENT_CHANGE_OR_DELETED')
                )
            } else {
                result.migrated++
            }
        })
    }

    return result
}

/**
 * Adds one table's counts into the running totals, changing `total` in place.
 */
function addResult(
    total: ContactMigrationEntityResult,
    next: ContactMigrationEntityResult
): void {
    total.queried += next.queried
    total.eligible += next.eligible
    total.migrated += next.migrated
    total.alreadyMigrated += next.alreadyMigrated
    total.manualReview += next.manualReview
    total.partiallyPopulated += next.partiallyPopulated
    total.failed += next.failed
    total.placeholderGivenNames += next.placeholderGivenNames
    total.placeholderFamilyNames += next.placeholderFamilyNames
    // Issues are concatenated rather than summed, so the response carries every
    // contact id that needs follow-up.
    total.issues.push(...next.issues)
}

/**
 * Runs the migration for the requested table(s) and assembles the response.
 *
 * Exported separately from `main` so tests and local scripts can drive it with
 * their own Prisma client, without going through the Lambda's env-var setup.
 */
export async function runContactsMigration(
    client: ExtendedPrismaClient,
    options: {
        entity: ContactMigrationEntity
        dryRun: boolean
    }
): Promise<MigrateContactsResponse> {
    // Collect all contacts
    // Both queries are issued together since they are independent. The one for
    // a table that was not requested resolves to an empty array immediately.
    const [stateContacts, actuaryContacts] = await Promise.all([
        options.entity === 'stateContacts' || options.entity === 'both'
            ? findSubmittedStateContacts(client)
            : Promise.resolve([]),
        options.entity === 'actuaryContacts' || options.entity === 'both'
            ? findSubmittedActuaryContacts(client)
            : Promise.resolve([]),
    ])

    // Template response. Starts as a success with zeroed totals
    const response: MigrateContactsResponse = {
        success: true,
        complete: true,
        dryRun: options.dryRun,
        entity: options.entity,
        totals: emptyResult(),
        results: {},
    }

    // Run migration on state Contacts
    if (options.entity === 'stateContacts' || options.entity === 'both') {
        const stateResult = await migrateContactRows(
            client,
            stateContacts,
            options.dryRun
        )
        response.results.stateContacts = stateResult
        addResult(response.totals, stateResult)
    }

    // Run migration on actuary contacts
    // Runs after the state contacts rather than alongside them, so the two
    // tables never compete for the same connections.
    if (options.entity === 'actuaryContacts' || options.entity === 'both') {
        const actuaryResult = await migrateContactRows(
            client,
            actuaryContacts,
            options.dryRun
        )
        response.results.actuaryContacts = actuaryResult
        addResult(response.totals, actuaryResult)
    }

    // Only write failures make the run unsuccessful. Contacts sent to manual
    // review are an expected outcome, not a failure.
    response.success = response.totals.failed === 0

    // Completeness is the other question: is anything still waiting on a
    // person? A run can succeed and still be incomplete, which is what happens
    // when the manual pass missed a row. What this run wrote is still correct,
    // since the two passes never touch the same rows, so the fix is to finish
    // the leftovers and run again -- never to roll anything back.
    response.complete =
        response.totals.manualReview === 0 &&
        response.totals.partiallyPopulated === 0
    return response
}

/**
 * The Lambda entry point. Validates the event, builds a Prisma client from the
 * environment, runs the migration, and returns the summary.
 */
export const main: Handler = async (
    event: MigrateContactsEvent = {}
): Promise<MigrateContactsResponse> => {
    // Default to both state and actuary contacts for migration, and default to
    // a dry run so an invocation with an empty or malformed payload cannot write
    // anything.
    const entity = event?.entity ?? 'both'
    const dryRun = event?.dryRun ?? true

    // The event arrives as untyped JSON, so both fields are checked at runtime
    // rather than trusted from the TypeScript type.
    if (!['stateContacts', 'actuaryContacts', 'both'].includes(entity)) {
        throw new Error(
            'Invalid entity. Expected one of: stateContacts, actuaryContacts, both'
        )
    }

    // Guard against `"dryRun": "false"` -- a non-boolean would otherwise be
    // truthy and silently turn a intended dry run into a real one.
    if (typeof dryRun !== 'boolean') {
        throw new Error('Invalid dryRun. Expected a boolean')
    }

    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required')
    }

    // getPostgresURL only reaches Secrets Manager when DATABASE_URL is the
    // literal string 'AWS_SM'; otherwise it returns the value unchanged, which
    // is what lets this same handler run against a local database.
    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        throw new Error(`Init Error: failed to get pg URL: ${dbConnResult}`)
    }

    const prismaClientResult = await NewPrismaClient(dbConnResult)
    if (prismaClientResult instanceof Error) {
        throw new Error(
            `Init Error: failed to create Prisma client: ${prismaClientResult}`
        )
    }

    // Log the parameters before the work starts, so a CloudWatch entry exists
    // even if the migration then fails partway through.
    console.info('Starting contacts migration', { entity, dryRun })
    const response = await runContactsMigration(prismaClientResult, {
        entity,
        dryRun,
    })
    // The response contains only contact ids and counts, never names or emails.
    console.info('Contacts migration complete', JSON.stringify(response))

    return response
}
