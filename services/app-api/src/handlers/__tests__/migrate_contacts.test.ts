import { describe, expect, test, vi } from 'vitest'
import type { ExtendedPrismaClient } from '../../postgres/prismaClient'
import {
    classifyContact,
    parseContactName,
    runContactsMigration,
} from '../migrate_contacts'

const emptyStructuredName = {
    prefix: null,
    givenName: null,
    middleName: null,
    familyName: null,
    suffix: null,
}

function contact(
    id: string,
    overrides: Record<string, unknown> = {}
): Record<string, unknown> {
    return {
        id,
        name: 'Jane Doe',
        ...emptyStructuredName,
        titleRole: 'Chief Actuary',
        email: 'contact@example.com',
        ...overrides,
    }
}

function mockClient(options?: {
    stateContacts?: Record<string, unknown>[]
    rateRevisions?: Array<{
        certifyingActuaryContacts: Record<string, unknown>[]
        addtlActuaryContacts: Record<string, unknown>[]
    }>
    stateUpdateCount?: number
    actuaryUpdateCount?: number
}): ExtendedPrismaClient {
    return {
        stateContact: {
            findMany: vi.fn().mockResolvedValue(options?.stateContacts ?? []),
            updateMany: vi
                .fn()
                .mockResolvedValue({ count: options?.stateUpdateCount ?? 1 }),
        },
        rateRevisionTable: {
            findMany: vi.fn().mockResolvedValue(options?.rateRevisions ?? []),
        },
        actuaryContact: {
            updateMany: vi
                .fn()
                .mockResolvedValue({ count: options?.actuaryUpdateCount ?? 1 }),
        },
    } as unknown as ExtendedPrismaClient
}

describe('parseContactName', () => {
    test('parses empty, single-part, and two-part names', () => {
        expect(parseContactName('   ')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'NO_GIVEN_NAME',
                middleName: null,
                familyName: 'NO_FAMILY_NAME',
                suffix: null,
            },
        })
        expect(parseContactName('Prince')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'Prince',
                middleName: null,
                familyName: 'NO_FAMILY_NAME',
                suffix: null,
            },
        })
        expect(parseContactName('María O’Connor')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'María',
                middleName: null,
                familyName: 'O’Connor',
                suffix: null,
            },
        })
        expect(parseContactName('J.R. Public')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'J.R.',
                middleName: null,
                familyName: 'Public',
                suffix: null,
            },
        })
    })

    test.each([
        {
            label: 'emoji stay on the family name they were typed on',
            name: 'John Cena💻🖥️⚙️',
            prefix: null,
            givenName: 'John',
            middleName: null,
            familyName: 'Cena💻🖥️⚙️',
            suffix: null,
        },
        {
            label: 'emoji stay on the given name they were typed on',
            name: 'Jane🌟 Doe',
            prefix: null,
            givenName: 'Jane🌟',
            middleName: null,
            familyName: 'Doe',
            suffix: null,
        },
        {
            label: 'standalone leading emoji merges into the given name',
            name: '✨ Jane Doe',
            prefix: null,
            givenName: '✨ Jane',
            middleName: null,
            familyName: 'Doe',
            suffix: null,
        },
        {
            label: 'standalone leading emoji merges into the prefix when there is one',
            name: '🎉 Dr. Maria Santos-Lopez 🇺🇸',
            prefix: '🎉 Dr.',
            givenName: 'Maria',
            middleName: null,
            familyName: 'Santos-Lopez',
            suffix: '🇺🇸',
        },
        {
            label: 'standalone interior emoji becomes the middle name',
            name: 'Bob ☎ Smith',
            prefix: null,
            givenName: 'Bob',
            middleName: '☎',
            familyName: 'Smith',
            suffix: null,
        },
        {
            label: 'standalone trailing emoji goes to the suffix',
            name: 'Jane Doe 🤼‍♀️',
            prefix: null,
            givenName: 'Jane',
            middleName: null,
            familyName: 'Doe',
            suffix: '🤼‍♀️',
        },
        {
            label: 'emoji prepended to a lone name stay attached',
            name: '💻Cena',
            prefix: null,
            givenName: '💻Cena',
            middleName: null,
            familyName: 'NO_FAMILY_NAME',
            suffix: null,
        },
        {
            label: 'a name of nothing but emoji becomes the given name',
            name: '🌷 🌹 🥀 ☘️',
            prefix: null,
            givenName: '🌷 🌹 🥀 ☘️',
            middleName: null,
            familyName: 'NO_FAMILY_NAME',
            suffix: null,
        },
    ])(
        'places emoji by position: $label',
        ({ name, prefix, givenName, middleName, familyName, suffix }) => {
            expect(parseContactName(name)).toEqual({
                parsedName: {
                    prefix,
                    givenName,
                    middleName,
                    familyName,
                    suffix,
                },
            })
        }
    )

    test('keeps credentials and suffixes in source order around attached emoji', () => {
        expect(parseContactName('Dr. Jane Doe🌟 MAAA Jr.')).toEqual({
            parsedName: {
                prefix: 'Dr.',
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe🌟',
                suffix: 'MAAA Jr.',
            },
        })
    })

    test.each([
        "Mary O'Brien",
        'María O’Connor',
        'José García-López',
        'J.R. Ewing',
        'Jane Doe MAAA Jr.',
    ])('leaves ordinary names untouched by emoji handling: %s', (name) => {
        const result = parseContactName(name)
        expect('parsedName' in result).toBe(true)
        if ('parsedName' in result) {
            expect(result.parsedName.suffix ?? '').not.toMatch(
                /\p{Extended_Pictographic}/u
            )
        }
    })

    test('parses three parts when exactly one part is an initial', () => {
        expect(parseContactName('John Q. Public')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'John',
                middleName: 'Q.',
                familyName: 'Public',
                suffix: null,
            },
        })
        expect(parseContactName('J. Quincy Public')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'J.',
                middleName: 'Quincy',
                familyName: 'Public',
                suffix: null,
            },
        })
    })

    test('extracts recognized prefixes and suffixes', () => {
        expect(parseContactName('Dr. Jane Doe')).toEqual({
            parsedName: {
                prefix: 'Dr.',
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
            },
        })
        expect(parseContactName('Jane Doe, III')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: 'III',
            },
        })
        expect(parseContactName('Dr. Jane Doe Jr., FSA, MAAA')).toEqual({
            parsedName: {
                prefix: 'Dr.',
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: 'Jr. FSA MAAA',
            },
        })
        expect(parseContactName('PhD Jane Doe')).toEqual({
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: 'PhD',
            },
        })
    })

    test.each([
        {
            label: 'trailing MD is a credential',
            name: 'Ann Lee MD',
            givenName: 'Ann',
            familyName: 'Lee',
            suffix: 'MD',
        },
        {
            label: 'a comma before MD is only a delimiter',
            name: 'Ann Lee, MD',
            givenName: 'Ann',
            familyName: 'Lee',
            suffix: 'MD',
        },
        {
            label: 'MD keeps source order with a generational suffix',
            name: 'Ann Lee MD Jr.',
            givenName: 'Ann',
            familyName: 'Lee',
            suffix: 'MD Jr.',
        },
        {
            label: 'dotted MD is recognized and keeps its spelling',
            name: 'Ann Lee M.D.',
            givenName: 'Ann',
            familyName: 'Lee',
            suffix: 'M.D.',
        },
        {
            label: 'dotted PhD is recognized',
            name: 'Jane Doe Ph.D.',
            givenName: 'Jane',
            familyName: 'Doe',
            suffix: 'Ph.D.',
        },
        {
            label: 'dotted FSA is recognized',
            name: 'Jane Doe F.S.A.',
            givenName: 'Jane',
            familyName: 'Doe',
            suffix: 'F.S.A.',
        },
        {
            label: 'dotted MD keeps source order with a generational suffix',
            name: 'Ann Lee M.D. Jr.',
            givenName: 'Ann',
            familyName: 'Lee',
            suffix: 'M.D. Jr.',
        },
        {
            label: 'leading dotted M.D. is a compound initial, not a doctorate',
            name: 'M.D. Smith',
            givenName: 'M.D.',
            familyName: 'Smith',
            suffix: null,
        },
        {
            label: 'a compound initial is never flattened into a suffix',
            name: 'J.R. Ewing',
            givenName: 'J.R.',
            familyName: 'Ewing',
            suffix: null,
        },
        {
            label: 'leading Md is the given name Mohammed, not a doctorate',
            name: 'Md Rahman',
            givenName: 'Md',
            familyName: 'Rahman',
            suffix: null,
        },
    ])('$label', ({ name, givenName, familyName, suffix }) => {
        expect(parseContactName(name)).toEqual({
            parsedName: {
                prefix: null,
                givenName,
                middleName: null,
                familyName,
                suffix,
            },
        })
    })

    test.each(['Md Abdul Karim', 'Md. Abdul Karim'])(
        'sends an ambiguous three-part Md name to review: %s',
        (name) => {
            expect(parseContactName(name)).toEqual({
                reason: 'AMBIGUOUS_MULTI_PART_NAME',
            })
        }
    )

    test.each([
        [
            'a three word VAL name fills the middle name',
            'Zuko Kyoshi Warrior',
            {
                prefix: null,
                givenName: 'Zuko',
                middleName: 'Kyoshi',
                familyName: 'Warrior',
                suffix: null,
            },
        ],
        [
            'a four word VAL name also fills the suffix',
            'Ty Lee Fire Lord',
            {
                prefix: null,
                givenName: 'Ty',
                middleName: 'Lee',
                familyName: 'Fire',
                suffix: 'Lord',
            },
        ],
    ])('uses the exact VAL sanitizer split: %s', (_label, name, expected) => {
        expect(parseContactName(name)).toEqual({ parsedName: expected })
    })

    test('a VAL name would be ambiguous without its table entry', () => {
        // Same shape, not in the table, so it is handed to a person instead.
        expect(parseContactName('Zuko Kyoshi Soldier')).toEqual({
            reason: 'AMBIGUOUS_MULTI_PART_NAME',
        })
    })

    test.each(['Name', 'name', 'NAME', '  Name  '])(
        'keeps the filler word as the given name rather than sending it to review: %s',
        (name) => {
            expect(parseContactName(name)).toEqual({
                parsedName: {
                    prefix: null,
                    givenName: name.trim(),
                    middleName: null,
                    familyName: 'NO_FAMILY_NAME',
                    suffix: null,
                },
            })
        }
    )

    test.each(['Mercer', 'Acme Actuaries', 'Medicaid Inbox', 'Widgets LLC'])(
        'still sends organizations and shared inboxes to review: %s',
        (name) => {
            expect(parseContactName(name)).toEqual({
                reason: 'NON_PERSON_OR_PLACEHOLDER_NAME',
            })
        }
    )

    test('rejects unsupported or ambiguous values', () => {
        expect(parseContactName('Mary Beth Smith')).toEqual({
            reason: 'AMBIGUOUS_MULTI_PART_NAME',
        })
        expect(parseContactName('Family, Given')).toEqual({
            reason: 'UNSUPPORTED_NAME_FORMAT',
        })
        expect(parseContactName('Given.Family')).toEqual({
            reason: 'UNSUPPORTED_NAME_FORMAT',
        })
        expect(parseContactName('Jo.hn Public')).toEqual({
            reason: 'UNSUPPORTED_NAME_FORMAT',
        })
    })
})

describe('classifyContact', () => {
    test('migrates a single-token name even when titleRole may hold the family name', () => {
        // Getting a given name onto every contact matters more than guessing
        // whether a one-word titleRole is a job title or a family name. The
        // deprecated `name` is retained, so the original value stays
        // recoverable.
        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-1', {
                    name: 'Jane',
                    titleRole: 'Smith',
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'ELIGIBLE',
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'NO_FAMILY_NAME',
                suffix: null,
            },
        })
    })

    test('still reports two people entered on one contact row', () => {
        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-1', {
                    name: 'Jane',
                    titleRole: 'Jane & John',
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'MANUAL_REVIEW',
            reason: 'MULTIPLE_PEOPLE_IN_TITLE_ROLE',
        })
    })

    // The check used to require a single-token name, so a two-token name beside
    // a titleRole holding two people parsed as given/family and was written as
    // ELIGIBLE -- leaving the second person with no contact row at all.
    it.each([
        ['Mercer', 'Lisa Deyer & Jacob Langerman = Principals'],
        ['Mercer', 'Jane Doe and John Roe'],
        ['Acme Consulting', 'Jane Doe & John Roe'],
        ['Milliman Inc', 'Jane Doe = John Roe'],
        ['Health Partners', 'Jane Doe and John Roe'],
    ])('sends %j beside titleRole %j to manual review', (name, titleRole) => {
        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-1', { name, titleRole }) as ReturnType<
                    typeof contact
                >),
            } as never)
        ).toEqual({
            status: 'MANUAL_REVIEW',
            reason: 'MULTIPLE_PEOPLE_IN_TITLE_ROLE',
        })
    })

    // A job title that merely contains `and` is not two people. Every value
    // here is taken from the DEV, VAL, or PROD data.
    it.each([
        'Medicaid Contracts and Monitoring Analyst',
        'Principal and Consulting Actuary',
        'Deputy Director, Quality Measurement and Reporting',
        'Director of Beneficiary Services and Grievances',
        'Medicaid and CHIP Oversight Director',
        'Section Chief - Medicaid Program Operations and Compliance',
    ])('treats %j as one job title, not two people', (titleRole) => {
        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-1', {
                    name: 'Jane Doe',
                    titleRole,
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'ELIGIBLE',
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
            },
        })
    })

    test('recognizes fully populated contacts and merges partial names', () => {
        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-1', {
                    givenName: 'Jane',
                    familyName: 'Doe',
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({ status: 'ALREADY_MIGRATED' })

        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-2', {
                    givenName: 'Jane',
                    familyName: null,
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'ELIGIBLE',
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
            },
        })

        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-3', {
                    givenName: null,
                    familyName: 'Doe',
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'ELIGIBLE',
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
            },
        })

        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-4', {
                    givenName: 'Janet',
                    familyName: null,
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'PARTIALLY_POPULATED',
            reason: 'STRUCTURED_NAME_CONFLICT',
        })

        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-5', {
                    suffix: 'FSA',
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'ELIGIBLE',
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: 'FSA',
            },
        })

        expect(
            classifyContact({
                contactType: 'STATE_CONTACT',
                ...(contact('state-6', {
                    givenName: 'Jane',
                    familyName: 'Doe',
                    titleRole: null,
                    email: null,
                }) as ReturnType<typeof contact>),
            } as never)
        ).toEqual({
            status: 'ELIGIBLE',
            parsedName: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
            },
        })
    })
})

describe('runContactsMigration', () => {
    test('classifies submitted state and actuary contacts in dry-run mode', async () => {
        const client = mockClient({
            stateContacts: [
                contact('state-easy'),
                contact('state-already', {
                    givenName: 'Jane',
                    familyName: 'Doe',
                }),
                contact('state-partial', { givenName: 'Janet' }),
                contact('state-title-family', {
                    name: 'Jane',
                    titleRole: 'Smith',
                }),
                contact('state-ambiguous', { name: 'Mary Beth Smith' }),
            ],
            rateRevisions: [
                {
                    certifyingActuaryContacts: [
                        contact('actuary-single', { name: 'Prince' }),
                    ],
                    addtlActuaryContacts: [
                        contact('actuary-single', { name: 'Prince' }),
                        contact('actuary-sanitized', {
                            name: 'Ty Lee Fire Lord',
                        }),
                    ],
                },
            ],
        })

        const result = await runContactsMigration(client, {
            entity: 'both',
            dryRun: true,
        })

        expect(result.success).toBe(true)
        // A run can succeed and still be incomplete: the writes it attempted
        // all landed, but rows are waiting on a person. The runbook's
        // prerequisite is this field, not `success`.
        expect(result.complete).toBe(false)
        expect(result.totals).toMatchObject({
            queried: 7,
            eligible: 4,
            migrated: 0,
            alreadyMigrated: 1,
            manualReview: 1,
            partiallyPopulated: 1,
            failed: 0,
            placeholderGivenNames: 0,
            placeholderFamilyNames: 2,
        })
        expect(result.totals.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contactID: 'state-ambiguous',
                    reason: 'AMBIGUOUS_MULTI_PART_NAME',
                }),
                expect.objectContaining({
                    contactID: 'state-partial',
                    reason: 'STRUCTURED_NAME_CONFLICT',
                }),
            ])
        )
        expect(client.stateContact.updateMany).not.toHaveBeenCalled()
        expect(client.actuaryContact.updateMany).not.toHaveBeenCalled()
        expect(client.stateContact.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    contractRevision: {
                        is: { submitInfoID: { not: null } },
                    },
                },
            })
        )
        expect(client.rateRevisionTable.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { submitInfoID: { not: null } },
                select: expect.objectContaining({
                    certifyingActuaryContacts: expect.any(Object),
                    addtlActuaryContacts: expect.any(Object),
                }),
            })
        )
    })

    test('writes eligible contacts and preserves legacy fields', async () => {
        const client = mockClient({
            stateContacts: [contact('state-1', { name: 'Dr. Jane Doe' })],
            rateRevisions: [
                {
                    certifyingActuaryContacts: [
                        contact('actuary-1', {
                            name: 'John Q. Public, FSA',
                        }),
                    ],
                    addtlActuaryContacts: [],
                },
            ],
        })

        const result = await runContactsMigration(client, {
            entity: 'both',
            dryRun: false,
        })

        expect(result.success).toBe(true)
        expect(result.complete).toBe(true)
        expect(result.totals).toMatchObject({
            queried: 2,
            eligible: 2,
            migrated: 2,
            failed: 0,
        })
        expect(client.stateContact.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    prefix: 'Dr.',
                    givenName: 'Jane',
                    middleName: null,
                    familyName: 'Doe',
                    suffix: null,
                    titleRole: 'Chief Actuary',
                    email: 'contact@example.com',
                },
            })
        )
        expect(client.actuaryContact.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    prefix: null,
                    givenName: 'John',
                    middleName: 'Q.',
                    familyName: 'Public',
                    suffix: 'FSA',
                    titleRole: 'Chief Actuary',
                    email: 'contact@example.com',
                },
            })
        )

        const stateUpdate = vi.mocked(client.stateContact.updateMany).mock
            .calls[0][0]
        expect(stateUpdate.data).not.toHaveProperty('name')
    })

    test('fills a missing required name without overwriting existing fields', async () => {
        const client = mockClient({
            stateContacts: [
                contact('state-partial', {
                    givenName: 'Jane',
                    familyName: null,
                    suffix: 'FSA',
                }),
            ],
        })

        const result = await runContactsMigration(client, {
            entity: 'stateContacts',
            dryRun: false,
        })

        expect(result.totals).toMatchObject({
            queried: 1,
            eligible: 1,
            migrated: 1,
            partiallyPopulated: 0,
            failed: 0,
        })
        expect(client.stateContact.updateMany).toHaveBeenCalledWith({
            where: {
                id: 'state-partial',
                name: 'Jane Doe',
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: null,
                suffix: 'FSA',
                titleRole: 'Chief Actuary',
                email: 'contact@example.com',
            },
            data: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: 'FSA',
                titleRole: 'Chief Actuary',
                email: 'contact@example.com',
            },
        })
    })

    test('fills missing title and email with required placeholders', async () => {
        const client = mockClient({
            stateContacts: [
                contact('state-missing-required', {
                    givenName: 'Jane',
                    familyName: 'Doe',
                    titleRole: '   ',
                    email: null,
                }),
            ],
        })

        const result = await runContactsMigration(client, {
            entity: 'stateContacts',
            dryRun: false,
        })

        expect(result.totals).toMatchObject({
            queried: 1,
            eligible: 1,
            migrated: 1,
            alreadyMigrated: 0,
            manualReview: 0,
            failed: 0,
        })
        expect(client.stateContact.updateMany).toHaveBeenCalledWith({
            where: {
                id: 'state-missing-required',
                name: 'Jane Doe',
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
                titleRole: '   ',
                email: null,
            },
            data: {
                prefix: null,
                givenName: 'Jane',
                middleName: null,
                familyName: 'Doe',
                suffix: null,
                titleRole: 'NO_TITLE_ROLE',
                email: 'no-email@example.com',
            },
        })
    })

    test('reports a concurrent change instead of overwriting it', async () => {
        const client = mockClient({
            stateContacts: [contact('state-1')],
            stateUpdateCount: 0,
        })

        const result = await runContactsMigration(client, {
            entity: 'stateContacts',
            dryRun: false,
        })

        expect(result.success).toBe(false)
        expect(result.totals).toMatchObject({
            queried: 1,
            eligible: 1,
            migrated: 0,
            failed: 1,
        })
        expect(result.totals.issues).toContainEqual({
            contactType: 'STATE_CONTACT',
            contactID: 'state-1',
            reason: 'CONCURRENT_CHANGE_OR_DELETED',
        })
    })
})

describe('missing-name placeholders', () => {
    test('stores one shared value rather than a per-contact variant', async () => {
        const client = mockClient({
            stateContacts: [
                contact('state-single', { name: 'Prince' }),
                contact('state-blank', { name: '   ' }),
            ],
            rateRevisions: [
                {
                    certifyingActuaryContacts: [
                        contact('actuary-single', { name: 'Cher' }),
                    ],
                    addtlActuaryContacts: [],
                },
            ],
        })

        const result = await runContactsMigration(client, {
            entity: 'both',
            dryRun: false,
        })

        expect(result.totals).toMatchObject({
            queried: 3,
            eligible: 3,
            migrated: 3,
            failed: 0,
            placeholderGivenNames: 1,
            placeholderFamilyNames: 3,
        })

        const stored = [
            ...vi.mocked(client.stateContact.updateMany).mock.calls,
            ...vi.mocked(client.actuaryContact.updateMany).mock.calls,
        ].map(([args]) => [
            (args.where as { id: string }).id,
            (args.data as { givenName: string }).givenName,
            (args.data as { familyName: string }).familyName,
        ])

        // Every missing part gets the identical string so external systems can
        // collapse the per-revision duplicates of one person.
        expect(stored).toEqual([
            ['state-single', 'Prince', 'NO_FAMILY_NAME'],
            ['state-blank', 'NO_GIVEN_NAME', 'NO_FAMILY_NAME'],
            ['actuary-single', 'Cher', 'NO_FAMILY_NAME'],
        ])
    })

    test('writes the same value for the same person on a later revision', async () => {
        const client = mockClient({
            stateContacts: [
                contact('rev-1-peter', { name: 'Peter' }),
                contact('rev-2-peter', { name: 'Peter' }),
            ],
        })

        await runContactsMigration(client, {
            entity: 'stateContacts',
            dryRun: false,
        })

        const stored = vi
            .mocked(client.stateContact.updateMany)
            .mock.calls.map(([args]) => args.data)

        expect(stored[0]).toEqual(stored[1])
    })

    test('counts placeholders in a dry run without writing them', async () => {
        const client = mockClient({
            stateContacts: [contact('state-single', { name: 'Prince' })],
        })

        const result = await runContactsMigration(client, {
            entity: 'stateContacts',
            dryRun: true,
        })

        expect(result.totals).toMatchObject({
            eligible: 1,
            migrated: 0,
            placeholderGivenNames: 0,
            placeholderFamilyNames: 1,
        })
        expect(client.stateContact.updateMany).not.toHaveBeenCalled()
    })

    test('treats an existing placeholder as already migrated on a re-run', async () => {
        const client = mockClient({
            stateContacts: [
                contact('state-done', {
                    givenName: 'Prince',
                    familyName: 'NO_FAMILY_NAME',
                }),
            ],
        })

        const result = await runContactsMigration(client, {
            entity: 'stateContacts',
            dryRun: false,
        })

        expect(result.totals).toMatchObject({
            queried: 1,
            alreadyMigrated: 1,
            eligible: 0,
            migrated: 0,
            placeholderFamilyNames: 0,
        })
        expect(client.stateContact.updateMany).not.toHaveBeenCalled()
    })
})
