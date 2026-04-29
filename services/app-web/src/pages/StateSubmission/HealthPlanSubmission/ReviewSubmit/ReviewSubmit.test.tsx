import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../testHelpers/jestHelpers'
import { ReviewSubmit } from './index'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockValidStateUser,
} from '@mc-review/mocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import {
    mockContractPackageDraft,
    mockContractPackageUnlockedWithUnlockedType,
} from '@mc-review/mocks'
import {
    TriggerValidationDocument,
    ValidationStatusDocument,
} from '../../../../gen/gqlClient'

const aiValidationFeatureFlags = {
    'ai-validation': true,
}

const VALIDATION_POLL_INTERVAL_MS = 5000
const VALIDATION_TIMEOUT_MS = 90_000

const validationStatusMock = (overrides?: {
    stage?: string
    isStale?: boolean
    error?: string | null
    coverageSummary?: {
        isPartial: boolean
        skippedDocuments: number
        failedDocuments: number
        ocrCappedDocuments: number
        deferredDocuments: number
        unprocessedDocuments: number
    } | null
    results?: {
        field: string
        outcome: string
        confidence: string
        message: string
        citations?: {
            chunkId: string
            documentName: string
            page: number | null
            startPage?: number | null
            endPage?: number | null
            order: number
        }[]
        supportingCitations?: {
            chunkId: string
            documentName: string
            page: number | null
            startPage?: number | null
            endPage?: number | null
            order: number
        }[]
        evidenceSummary?: {
            consideredDocumentCount: number
            supportingDocumentCount: number
        }
    }[]
}) => ({
    request: {
        query: ValidationStatusDocument,
        variables: {
            input: {
                contractID: 'test-abc-123',
            },
        },
    },
    result: {
        data: {
            validationStatus: {
                __typename: 'ValidationStatusPayload' as const,
                stage: overrides?.stage ?? 'not-started',
                artifactVersion: 'test-artifact-version',
                isStale: overrides?.isStale ?? false,
                error: overrides?.error ?? null,
                coverageSummary: overrides?.coverageSummary ?? null,
                results: overrides?.results ?? [],
            },
        },
    },
})

const triggerValidationMock = () => ({
    request: {
        query: TriggerValidationDocument,
        variables: {
            input: {
                contractID: 'test-abc-123',
            },
        },
    },
    result: {
        data: {
            triggerValidation: {
                __typename: 'TriggerValidationPayload' as const,
                ok: true,
                artifactVersion: 'test-artifact-version',
            },
        },
    },
})

const repeatedValidationStatusMocks = (
    count: number,
    overrides?: Parameters<typeof validationStatusMock>[0]
) => Array.from({ length: count }, () => validationStatusMock(overrides))

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
        })
    })

    it('displays edit buttons for every section', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThan(1)
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
        })
    })

    it('does not display zip download buttons', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            const bulkDownloadButtons = screen.queryAllByRole('button', {
                name: /documents/,
            })
            expect(bulkDownloadButtons).toHaveLength(0)
        })
    })

    it('renders info from a draft contract', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()

            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
            const submissionDescription =
                screen.queryByText('A real submission')
            expect(submissionDescription).toBeInTheDocument()
        })
    })

    it('extracts the correct document dates from unlocked submission and displays them in tables', async () => {
        const contractMock = fetchContractMockSuccess({
            contract: mockContractPackageUnlockedWithUnlockedType({
                contractSubmissionType: 'HEALTH_PLAN',
            }),
        })

        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        contractMock,
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(4)
            // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
            expect(within(rows[0]).getByText('Date added')).toBeInTheDocument()
            expect(within(rows[1]).getByText('02/01/2023')).toBeInTheDocument()
            expect(within(rows[2]).getByText('Date added')).toBeInTheDocument()
            expect(within(rows[3]).getByText('03/01/2023')).toBeInTheDocument()
        })
    })

    it('displays back, save as draft, and submit buttons', async () => {
        const { user } = renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await screen.findByRole('button', {
            name: 'Back',
        })

        expect(screen.getByTestId('form-submit')).toBeDefined()
        expect(screen.getAllByText('Submit')).toHaveLength(2)
        await user.click(screen.getAllByText('Submit')[0])
    })

    it('pulls the right version of UNLOCKED data for state users', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        fetchContractMockSuccess({
                            contract:
                                mockContractPackageUnlockedWithUnlockedType({
                                    contractSubmissionType: 'HEALTH_PLAN',
                                }),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        const description = await screen.findByLabelText(
            'Submission description'
        )
        expect(description).toHaveTextContent('An updated submission')
        const ratingPeriod = await screen.findByLabelText(
            'Rating period of original rate certification'
        )
        expect(ratingPeriod).toHaveTextContent('02/02/2020 to 02/02/2021')
    })

    it('hides the legacy shared rates across submissions UI for state users when unlocked', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        fetchContractMockSuccess({
                            contract:
                                mockContractPackageUnlockedWithUnlockedType({
                                    contractSubmissionType: 'HEALTH_PLAN',
                                }),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        expect(
            await screen.queryByText('Linked submissions')
        ).not.toBeInTheDocument()
        expect(await screen.queryByText('SHARED')).not.toBeInTheDocument()
    })

    it('renders inline error when contract and rates submissions does not have any rate certifications', async () => {
        const unlockedContract = mockContractPackageUnlockedWithUnlockedType({
            id: 'test-abc-123',
            contractSubmissionType: 'HEALTH_PLAN',
        })
        unlockedContract.draftRates = []

        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: unlockedContract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'You must add a rate certification before you can resubmit.'
                )
            ).toBeInTheDocument()
        })
    })

    describe('AI validation status', () => {
        it('displays a calm validation pending message on the review page', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'not-started',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review pending')
            ).toBeInTheDocument()

            expect(
                screen.getByText(
                    'We have not started reviewing the uploaded documents yet. You can continue reviewing and submit at any time.'
                )
            ).toBeInTheDocument()

            const contractDetailsSection = screen
                .getByRole('heading', { name: 'Contract details' })
                .closest('section')
            expect(contractDetailsSection).toHaveTextContent(
                'Document review pending'
            )
        })

        it('shows an in-progress validation message while backend work is running', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'retrieving',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review in progress')
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'We are reviewing the uploaded documents and comparing them with the submission dates.'
                )
            ).toBeInTheDocument()
        })

        it('shows a completed validation message when polling reports complete', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review complete')
            ).toBeInTheDocument()
        })

        it('replaces the timed-out banner when polling later reports complete', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            ...repeatedValidationStatusMocks(19, {
                                stage: 'retrieving',
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Start date matches document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review in progress')
            ).toBeInTheDocument()

            await vi.advanceTimersByTimeAsync(VALIDATION_TIMEOUT_MS)

            expect(
                await screen.findByText('Document review still in progress')
            ).toBeInTheDocument()

            await vi.advanceTimersByTimeAsync(VALIDATION_POLL_INTERVAL_MS)

            expect(
                await screen.findByText('Document review complete')
            ).toBeInTheDocument()
            expect(
                screen.queryByText('Document review still in progress')
            ).not.toBeInTheDocument()
        })

        it('shows limited-coverage wording when completion is partial', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                coverageSummary: {
                                    isPartial: true,
                                    skippedDocuments: 2,
                                    failedDocuments: 1,
                                    ocrCappedDocuments: 0,
                                    deferredDocuments: 1,
                                    unprocessedDocuments: 2,
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText(
                    'Document review complete with limited coverage'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'No date mismatches were found in the reviewed documents.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'No date mismatches were found in the reviewed documents.'
                )
            ).toBeInTheDocument()
            expect(
                screen.queryByText(
                    /Some uploaded documents could not be fully reviewed\./
                )
            ).not.toBeInTheDocument()
        })

        it('shows a non-blocking unavailable message when validation status fails', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'failed',
                                error: 'Validation pipeline failed',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review unavailable')
            ).toBeInTheDocument()
        })
    })

    describe('AI validation findings', () => {
        it('renders findings when validation completes with results', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Document start date (01/01/2021) matches form start date (01/01/2021).',
                                        citations: [
                                            {
                                                chunkId: 'scan-a.pdf::chunk-0',
                                                documentName: 'scan-a.pdf',
                                                page: null,
                                                order: 0,
                                            },
                                        ],
                                    },
                                    {
                                        field: 'amendmentEffectiveDate',
                                        outcome: 'mismatch',
                                        confidence: 'medium',
                                        message:
                                            'Document amendment effective date (01/01/2021) does not match form amendment effective date (02/01/2021).',
                                        citations: [
                                            {
                                                chunkId: 'scan-a.pdf::chunk-1',
                                                documentName: 'scan-a.pdf',
                                                page: 2,
                                                order: 1,
                                            },
                                            {
                                                chunkId: 'scan-b.pdf::chunk-0',
                                                documentName: 'scan-b.pdf',
                                                page: 4,
                                                order: 0,
                                            },
                                        ],
                                        supportingCitations: [
                                            {
                                                chunkId: 'scan-c.pdf::chunk-0',
                                                documentName: 'scan-c.pdf',
                                                page: 6,
                                                order: 0,
                                            },
                                        ],
                                        evidenceSummary: {
                                            consideredDocumentCount: 3,
                                            supportingDocumentCount: 3,
                                        },
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review complete')
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'A date mismatch was found in the reviewed documents.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'View document review',
                })
            ).toBeInTheDocument()

            await userEvent.click(
                screen.getByRole('button', { name: 'View document review' })
            )

            expect(
                screen.getByRole('heading', {
                    name: 'Document review details',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'These results are advisory and do not block submission.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    '1 date needs review. 1 date matches the reviewed documents.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Hide document review',
                })
            ).toBeInTheDocument()

            expect(screen.getByText('Contract start date')).toBeInTheDocument()
            expect(
                screen.getByText('Amendment effective date')
            ).toBeInTheDocument()
            expect(screen.getByText('Matches documents')).toBeInTheDocument()
            expect(screen.getByText('Needs review')).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Document start date (01/01/2021) matches form start date (01/01/2021).'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Document amendment effective date (01/01/2021) does not match form amendment effective date (02/01/2021).'
                )
            ).toBeInTheDocument()
            expect(screen.getAllByText('Submitted:')).toHaveLength(2)
            expect(screen.getAllByText('Reviewed documents:')).toHaveLength(2)
            expect(screen.getByText('02/01/2021')).toBeInTheDocument()
            expect(screen.getAllByText('01/01/2021').length).toBeGreaterThan(1)
            expect(
                screen.getByText(
                    'Submitted date differs from reviewed document date.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getAllByText('Primary reviewed reference:')
            ).toHaveLength(2)
            expect(
                screen.getByText(
                    'Additional supporting references from 1 reviewed document:'
                )
            ).toBeInTheDocument()
            const validationStatusRegion = within(
                screen.getByLabelText('Document review details')
            )
            expect(
                validationStatusRegion.getAllByText('scan-a.pdf')
            ).toHaveLength(2)
            expect(
                validationStatusRegion.getByText('Page unknown')
            ).toBeInTheDocument()
            expect(
                validationStatusRegion.getByText('Page 2')
            ).toBeInTheDocument()
            expect(
                validationStatusRegion.getByText('scan-b.pdf')
            ).toBeInTheDocument()
            expect(
                validationStatusRegion.getByText('Page 4')
            ).toBeInTheDocument()
            expect(
                validationStatusRegion.getByText('scan-c.pdf')
            ).toBeInTheDocument()
            expect(
                validationStatusRegion.getByText('Page 6')
            ).toBeInTheDocument()
        })

        it('shows a compact advisory note when a field could not be verified', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'mismatch',
                                        confidence: 'high',
                                        message:
                                            'Document start date (01/01/2021) does not match form start date (02/01/2021).',
                                        citations: [],
                                    },
                                    {
                                        field: 'contractEndDate',
                                        outcome: 'not-enough-evidence',
                                        confidence: 'low',
                                        message:
                                            'Could not verify contract end date from the reviewed documents.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            await userEvent.click(
                await screen.findByRole('button', {
                    name: 'View document review',
                })
            )

            expect(
                screen.getByText(
                    'Reviewed documents did not provide enough clear date evidence for this field.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    '1 date needs review. 1 date could not be verified.'
                )
            ).toBeInTheDocument()
        })

        it('uses conservative findings copy when document coverage is partial', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                coverageSummary: {
                                    isPartial: true,
                                    skippedDocuments: 2,
                                    failedDocuments: 1,
                                    ocrCappedDocuments: 1,
                                    deferredDocuments: 0,
                                    unprocessedDocuments: 2,
                                },
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Start date matches document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText(
                    'Document review complete with limited coverage'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'No date mismatches were found in the reviewed documents.'
                )
            ).toBeInTheDocument()
            expect(
                screen.queryByRole('button', { name: 'View document review' })
            ).not.toBeInTheDocument()
        })

        it('renders mismatch findings on demand and allows the user to collapse them', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'mismatch',
                                        confidence: 'high',
                                        message:
                                            'Start date does not match document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByRole('button', {
                    name: 'View document review',
                })
            ).toBeInTheDocument()

            await userEvent.click(
                screen.getByRole('button', { name: 'View document review' })
            )

            expect(
                within(
                    screen.getByLabelText('Document review details')
                ).getByText('Result:')
            ).toBeInTheDocument()
            expect(
                within(
                    screen.getByLabelText('Document review details')
                ).getByText('Confidence:')
            ).toBeInTheDocument()

            await userEvent.click(
                screen.getByRole('button', { name: 'Hide document review' })
            )

            expect(
                screen.queryByText('Contract start date')
            ).not.toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'View document review' })
            ).toBeInTheDocument()
        })

        it('renders a neutral fallback when a mismatch finding has no citation details', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'mismatch',
                                        confidence: 'low',
                                        message:
                                            'The document text does not match the submission date.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByRole('button', {
                    name: 'View document review',
                })
            ).toBeInTheDocument()

            await userEvent.click(
                screen.getByRole('button', { name: 'View document review' })
            )

            expect(
                screen.getByText('No reviewed document reference available.')
            ).toBeInTheDocument()
        })

        it('does not render findings when validation is complete but results are empty', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review complete')
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'No date mismatches were found in the reviewed documents.'
                )
            ).toBeInTheDocument()

            expect(
                screen.queryByRole('heading', {
                    name: 'Document review details',
                })
            ).not.toBeInTheDocument()
        })

        it('does not offer expandable details when complete findings contain no mismatch', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Start date matches document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review complete')
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'No date mismatches were found in the reviewed documents.'
                )
            ).toBeInTheDocument()
            expect(
                screen.queryByRole('button', { name: 'View document review' })
            ).not.toBeInTheDocument()
        })

        it('does not render stale findings even if results are present', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                isStale: true,
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Start date matches document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Refreshing document review')
            ).toBeInTheDocument()

            expect(
                screen.queryByRole('heading', {
                    name: 'Document review details',
                })
            ).not.toBeInTheDocument()
        })
    })

    describe('AI validation trigger flow', () => {
        it('triggers validation when status is not started', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'not-started',
                            }),
                            triggerValidationMock(),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review pending')
            ).toBeInTheDocument()
        })

        it('does not trigger validation when work is already in progress', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'retrieving',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review in progress')
            ).toBeInTheDocument()
        })

        it('does not trigger validation when current-version results are already complete', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Start date matches document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Document review complete')
            ).toBeInTheDocument()
        })

        it('triggers validation again when the current status is stale', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            validationStatusMock({
                                stage: 'complete',
                                isStale: true,
                                results: [
                                    {
                                        field: 'contractStartDate',
                                        outcome: 'match',
                                        confidence: 'high',
                                        message:
                                            'Start date matches document text.',
                                        citations: [],
                                    },
                                ],
                            }),
                            triggerValidationMock(),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: aiValidationFeatureFlags,
                }
            )

            expect(
                await screen.findByText('Refreshing document review')
            ).toBeInTheDocument()
        })

        it('does not render validation UI when the feature flag is off', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: {},
                }
            )

            expect(
                await screen.findByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
            expect(
                screen.queryByLabelText('Document review summary')
            ).not.toBeInTheDocument()
            expect(
                screen.queryByRole('heading', {
                    name: /Document review/i,
                })
            ).not.toBeInTheDocument()
        })
    })
})
