import { screen, waitFor, within } from '@testing-library/react'

import { StateDashboard } from './StateDashboard'
import {
    fetchCurrentUserMock,
    indexContractsMockSuccess,
    mockContractPackageUnlockedWithUnlockedType,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { Contract } from '../../gen/gqlClient'

describe('StateDashboard', () => {
    it('display submission heading', async () => {
        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsMockSuccess(),
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
                    indexContractsMockSuccess(),
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
        const draft = mockContractPackageDraft()
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        draft.draftRevision!.updatedAt = new Date('2100-01-01')
        const submitted = mockContractPackageSubmitted()
        submitted.packageSubmissions[0].contractRevision.updatedAt = new Date(
            '1991-01-01'
        )

        const unlockedType = mockContractPackageUnlockedWithUnlockedType()
        const unlocked: Contract = {
            ...mockContractPackageUnlockedWithUnlockedType({
                draftRevision: {
                    ...unlockedType.draftRevision,
                    updatedAt: new Date('2020-01-01'),
                },
            }),
            __typename: 'Contract',
        }

        draft.id = 'test-abc-draft'
        submitted.id = 'test-abc-submitted'
        unlocked.id = 'test-abc-unlocked'

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexContractsMockSuccess(submissions),
                ],
            },
        })

        // we want to check that there's a table with three submissions, sorted by `updatedAt`.
        const rows = await screen.findAllByRole('row')

        const link1 = within(rows[1]).getByRole('link')
        expect(link1).toHaveAttribute(
            'href',
            '/submissions/test-abc-draft/edit/type'
        )

        const link2 = within(rows[2]).getByRole('link')
        expect(link2).toHaveAttribute(
            'href',
            '/submissions/test-abc-unlocked/edit/review-and-submit'
        )

        const link3 = within(rows[3]).getByRole('link')
        expect(link3).toHaveAttribute('href', '/submissions/test-abc-submitted')
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
        const draft = mockContractPackageDraft()
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        draft.draftRevision!.updatedAt = new Date('2100-01-01')
        const submitted = mockContractPackageSubmitted()
        submitted.packageSubmissions[0].contractRevision.updatedAt = new Date(
            '1991-01-01'
        )

        const unlockedType = mockContractPackageUnlockedWithUnlockedType()
        const unlocked: Contract = {
            ...mockContractPackageUnlockedWithUnlockedType({
                draftRevision: {
                    ...unlockedType.draftRevision,
                    updatedAt: new Date('2020-01-01'),
                },
            }),
            __typename: 'Contract',
        }

        draft.id = 'test-abc-draft'
        submitted.id = 'test-abc-submitted'
        unlocked.id = 'test-abc-unlocked'

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<StateDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexContractsMockSuccess(submissions),
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
                    indexContractsMockSuccess(),
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
