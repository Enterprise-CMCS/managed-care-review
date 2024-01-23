import {
    packageStatus,
    packageSubmittedAt,
    packageSubmitters,
} from './healthPlanPackage'
import type {
    HealthPlanPackageStatusType,
    HealthPlanPackageType,
} from './HealthPlanPackageType'

describe('HealthPlanPackage helpers', () => {
    it('status returns the expected status', () => {
        const tests: [HealthPlanPackageType, HealthPlanPackageStatusType][] = [
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'bar',
                            createdAt: new Date(),
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                'DRAFT',
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'bar',
                            createdAt: new Date(),
                            submitInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'test@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                'SUBMITTED',
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'baz',
                            createdAt: new Date(),
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'test@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                'UNLOCKED',
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'baz',
                            createdAt: new Date(),
                            submitInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'test@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'test@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            submitInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'test@example.com',
                                updatedReason:
                                    'This is the reason for resubmitting',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                'RESUBMITTED',
            ],
        ]

        for (const test of tests) {
            const [sub, expectedStatus] = test

            const testStatus = packageStatus(sub)

            expect(testStatus).toEqual(expectedStatus)
        }
    })

    it('status returns an error with an invalid submission', () => {
        const tests: [HealthPlanPackageType, Error][] = [
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [],
                },
                new Error(
                    'No revisions on this submission with contractID: foo'
                ),
            ],
        ]

        for (const test of tests) {
            const [sub, expectedError] = test

            const testStatus = packageStatus(sub)

            expect(testStatus).toEqual(expectedError)
        }
    })

    it('submittedAt returns the expected date', () => {
        const tests: [HealthPlanPackageType, Date | undefined][] = [
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'bar',
                            createdAt: new Date(),
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                undefined,
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'bar',
                            createdAt: new Date(),
                            submitInfo: {
                                updatedAt: new Date(2022, 1, 1),
                                updatedBy: 'test@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                new Date(2022, 1, 1),
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'baz',
                            createdAt: new Date(),
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            submitInfo: {
                                updatedAt: new Date(2022, 1, 1),
                                updatedBy: 'test@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                new Date(2022, 1, 1),
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'baz',
                            createdAt: new Date(),
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            submitInfo: {
                                updatedAt: new Date(2022, 2, 4),
                                updatedBy: 'test@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                new Date(2022, 2, 4),
            ],
        ]

        for (const test of tests) {
            const [sub, expectedDate] = test

            const testDate = packageSubmittedAt(sub)

            expect(testDate).toEqual(expectedDate)
        }
    })

    it('returns expected package submitters', () => {
        const tests: [HealthPlanPackageType, string[]][] = [
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'baz',
                            createdAt: new Date(),
                            submitInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'submitter1@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'unlocker@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            submitInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'submitter1@example.com',
                                updatedReason:
                                    'This is the reason for resubmitting',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                ['submitter1@example.com'],
            ],
            [
                {
                    id: 'foo',
                    stateCode: 'FL' as const,
                    revisions: [
                        {
                            id: 'baz',
                            createdAt: new Date('2022-01-01'),
                            submitInfo: {
                                updatedAt: new Date(),
                                updatedBy: 'submitter1@example.com',
                                updatedReason: 'Initial submit',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date('2022-01-02'),
                                updatedBy: 'unlocker@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            submitInfo: {
                                updatedAt: new Date('2022-01-03'),
                                updatedBy: 'submitter2@example.com',
                                updatedReason:
                                    'This is the reason for resubmitting',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date('2022-01-04'),
                                updatedBy: 'unlocker@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            submitInfo: {
                                updatedAt: new Date('2022-01-05'),
                                updatedBy: 'submitter3@example.com',
                                updatedReason:
                                    'This is the reason for resubmitting',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date('2022-01-06'),
                                updatedBy: 'unlocker@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            submitInfo: {
                                updatedAt: new Date('2022-01-07'),
                                updatedBy: 'submitter1@example.com',
                                updatedReason:
                                    'This is the reason for resubmitting',
                            },
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                        {
                            id: 'bar',
                            createdAt: new Date('2022-01-01'),
                            unlockInfo: {
                                updatedAt: new Date('2022-01-08'),
                                updatedBy: 'unlocker@example.com',
                                updatedReason:
                                    'This is the reason for unlocking',
                            },
                            submitInfo: undefined,
                            formDataProto: Buffer.from([1, 2, 3]),
                        },
                    ],
                },
                [
                    'submitter1@example.com',
                    'submitter2@example.com',
                    'submitter3@example.com',
                ],
            ],
        ]

        for (const test of tests) {
            const [pkg, expectedSubmitters] = test

            const testSubmitters = packageSubmitters(pkg)

            expect(testSubmitters).toEqual(expectedSubmitters)
        }
    })
})
