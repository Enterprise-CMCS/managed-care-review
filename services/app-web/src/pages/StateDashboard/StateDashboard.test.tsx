import { screen, waitFor, within } from '@testing-library/react'

import { StateDashboard } from './StateDashboard'
import {
    fetchCurrentUserMock,
    indexSubmissionsMockSuccess,
    mockContractStripped,
    mockUnlockedContractStripped,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('StateDashboard', () => {
    it('display submission heading', async () => {
        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess([]),
                ],
            },
        })

        await waitFor(() =>
            expect(
                screen.getAllByRole('heading', {
                    level: 2,
                    name: 'Submissions',
                })
            ).toBeDefined()
        )
    })

    it('displays new submission link', async () => {
        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess([]),
                ],
            },
        })

        await waitFor(() => {
            const links = screen.getAllByRole('link', {
                name: 'Start new submission',
            })
            expect(links).toBeDefined()
            expect(links[0]).toHaveAttribute('href', '/submissions/new')
        })
    })

    it('displays texts "sent to CMS", "you can view your review decision", and link "view submission summary" if submission type is EQRO', async () => {
        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess([]),
                ],
            },
            routerProvider: {
                route: '/dashboard/submissions?justSubmitted=MCR-MN-0001-SNBC&contractType=EQRO&id=ba46c7ec-7d07-477f-ad24-feef608b08aa',
            },
        })

        await waitFor(() => {
            expect(
                screen.getByText(/MCR-MN-0001-SNBC was sent to CMS/)
            ).toBeInTheDocument()

            expect(
                screen.getByText(
                    /You can view your review decision on the submission summary/
                )
            ).toBeInTheDocument()

            const link = screen.getByRole('link', {
                name: /View submission summary/i,
            })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute(
                'href',
                '/submissions/eqro/ba46c7ec-7d07-477f-ad24-feef608b08aa'
            )
        })
    })

    it('displays texts "sent to CMS", "you can view your review decision", and link "view submission summary" if submission type is HEALTH_PLAN', async () => {
        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess([]),
                ],
            },
            routerProvider: {
                route: '/dashboard/submissions?justSubmitted=MCR-MN-0001-SNBC&contractType=HEALTH_PLAN&id=ba46c7ec-7d07-477f-ad24-feef608b08aa',
            },
        })

        await waitFor(() => {
            expect(
                screen.getByText(/MCR-MN-0001-SNBC was sent to CMS/)
            ).toBeInTheDocument()

            expect(
                screen.getByText(
                    /To make edits, ask your DMCO lead analyst to unlock your submission/
                )
            ).toBeInTheDocument()

            const link = screen.getByRole('link', {
                name: /View submission summary/i,
            })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute(
                'href',
                '/submissions/health-plan/ba46c7ec-7d07-477f-ad24-feef608b08aa'
            )
        })
    })

    it('displays submissions table', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    {
                        id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        fullName: 'Special Needs Basic Care',
                        name: 'SNBC',
                        isRateProgram: false,
                    },
                    {
                        id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        fullName: 'Prepaid Medical Assistance Program',
                        name: 'PMAP',
                        isRateProgram: false,
                    },
                    {
                        id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        fullName: 'Minnesota Senior Care Plus ',
                        name: 'MSC+',
                        isRateProgram: false,
                    },
                    {
                        id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        fullName: 'Minnesota Senior Health Options',
                        name: 'MSHO',
                        isRateProgram: false,
                    },
                ],
            },
            role: 'State User',
            email: 'bob@dmas.mn.gov',
        }

        // set draft current revision to a far future updatedAt. Set unlocked to nearer future. This allows us to test sorting.
        const draft = mockContractStripped({
            id: 'test-abc-draft',
            status: 'DRAFT',
            consolidatedStatus: 'DRAFT',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            draftRevision: {
                __typename: 'ContractRevisionStripped',
                id: 'draft-rev-1',
                contractID: 'test-abc-draft',
                createdAt: new Date('2100-01-01'),
                updatedAt: new Date('2100-01-01'),
                contractName: 'MCR-MN-0005-SNBC',
                submitInfo: null,
                unlockInfo: null,
                formData: {
                    __typename: 'ContractFormDataStripped',
                    programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    contractDateStart: new Date('2024-01-01'),
                    contractDateEnd: new Date('2025-01-01'),
                    managedCareEntities: ['MCO'],
                },
            },
            latestSubmittedRevision: null,
        })

        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexSubmissionsMockSuccess(submissions),
                ],
            },
        })

        // we want to check that there's a table with three submissions, sorted by `updatedAt`.
        const rows = await screen.findAllByRole('row')

        const link1 = within(rows[1]).getByRole('link')
        expect(link1).toHaveAttribute(
            'href',
            '/submissions/health-plan/test-abc-draft/edit/type'
        )

        const link2 = within(rows[2]).getByRole('link')
        expect(link2).toHaveAttribute(
            'href',
            '/submissions/health-plan/test-abc-unlocked/edit/review-and-submit'
        )

        const link3 = within(rows[3]).getByRole('link')
        expect(link3).toHaveAttribute(
            'href',
            '/submissions/health-plan/test-abc-submitted'
        )
    })

    it('displays the review status tag when it has been set', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    {
                        id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        fullName: 'Special Needs Basic Care',
                        name: 'SNBC',
                        isRateProgram: false,
                    },
                    {
                        id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        fullName: 'Prepaid Medical Assistance Program',
                        name: 'PMAP',
                        isRateProgram: false,
                    },
                    {
                        id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        fullName: 'Minnesota Senior Care Plus ',
                        name: 'MSC+',
                        isRateProgram: false,
                    },
                    {
                        id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        fullName: 'Minnesota Senior Health Options',
                        name: 'MSHO',
                        isRateProgram: false,
                    },
                ],
            },
            role: 'State User',
            email: 'bob@dmas.mn.gov',
        }

        const approved = mockContractStripped({
            id: 'test-abc-approved',
            consolidatedStatus: 'APPROVED',
            reviewStatus: 'APPROVED',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            reviewStatusActions: [
                {
                    __typename: 'ContractReviewStatusActions',
                    contractID: 'test-abc-approved',
                    updatedAt: new Date('2100-01-01'),
                    actionType: 'MARK_AS_APPROVED',
                },
            ],
        })

        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const submissions = [approved, submitted, unlocked]

        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexSubmissionsMockSuccess(submissions),
                ],
            },
        })

        // we want to check that there's a table with three submissions, sorted by `updatedAt`.
        const rows = await screen.findAllByRole('row')

        const row1 = within(rows[1]).getByTestId('submission-status')
        expect(row1).toHaveTextContent('Approved')

        const row2 = within(rows[2]).getByTestId('submission-status')
        expect(row2).toHaveTextContent('Unlocked')

        const row3 = within(rows[3]).getByTestId('submission-status')
        expect(row3).toHaveTextContent('Submitted')
    })

    it('displays submissions table without rate programs', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    {
                        id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        fullName: 'Special Needs Basic Care',
                        name: 'SNBC',
                        isRateProgram: true,
                    },
                    {
                        id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        fullName: 'Prepaid Medical Assistance Program',
                        name: 'PMAP',
                        isRateProgram: true,
                    },
                    {
                        id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        fullName: 'Minnesota Senior Care Plus ',
                        name: 'MSC+',
                        isRateProgram: true,
                    },
                    {
                        id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        fullName: 'Minnesota Senior Health Options',
                        name: 'MSHO',
                        isRateProgram: true,
                    },
                ],
            },
            role: 'State User',
            email: 'bob@dmas.mn.gov',
        }

        // set draft current revision to a far future updatedAt. Set unlocked to nearer future. This allows us to test sorting.
        const draft = mockContractStripped({
            id: 'test-abc-draft',
            status: 'DRAFT',
            consolidatedStatus: 'DRAFT',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            draftRevision: {
                __typename: 'ContractRevisionStripped',
                id: 'draft-rev-1',
                contractID: 'test-abc-draft',
                createdAt: new Date('2100-01-01'),
                updatedAt: new Date('2100-01-01'),
                contractName: 'MCR-MN-0005-SNBC',
                submitInfo: null,
                unlockInfo: null,
                formData: {
                    __typename: 'ContractFormDataStripped',
                    programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    contractDateStart: new Date('2024-01-01'),
                    contractDateEnd: new Date('2025-01-01'),
                    managedCareEntities: ['MCO'],
                },
            },
            latestSubmittedRevision: null,
        })

        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexSubmissionsMockSuccess(submissions),
                ],
            },
        })

        await waitFor(() => {
            expect(screen.getByText(/No programs exist/)).toBeInTheDocument()
        })
    })

    it('should not display filters on state dashboard page', async () => {
        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess([]),
                ],
            },
        })

        await waitFor(() => {
            expect(
                screen.queryByTestId('state-dashboard-page')
            ).toBeInTheDocument()
            expect(screen.queryByTestId('accordion')).not.toBeInTheDocument()
        })
    })
})
