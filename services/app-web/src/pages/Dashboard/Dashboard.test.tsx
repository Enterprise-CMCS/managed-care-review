import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor, within } from '@testing-library/react'

import { Dashboard, sortDraftsToTop } from './Dashboard'
import {
    fetchCurrentUserMock,
    indexSubmissionsMockSuccess,
    mockDraft,
    mockStateSubmission,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('Dashboard', () => {
    it('display submission heading', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess(),
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
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess(),
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

    it('displays tabs for available programs based on loggedInUser state', async () => {
        const mockUser = {
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    { id: 'msho', name: 'MSHO' },
                    { id: 'pmap', name: 'PMAP' },
                    { id: 'snbc', name: 'SNBC' },
                ],
            },
            role: 'State User',
            name: 'Bob it user',
            email: 'bob@dmas.mn.gov',
        }

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexSubmissionsMockSuccess(),
                ],
            },
        })

        await waitFor(() => {
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(3)
            expect(tabs[0].textContent).toBe('MSHO')
            expect(tabs[1].textContent).toBe('PMAP')
        })
    })

    it('displays submission cards', async () => {
        const mockUser = {
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    { id: 'msho', name: 'MSHO' },
                    { id: 'pmap', name: 'PMAP' },
                    { id: 'snbc', name: 'SNBC' },
                ],
            },
            role: 'State User',
            name: 'Bob it user',
            email: 'bob@dmas.mn.gov',
        }

        const submissions = [
            mockDraft(),
            mockStateSubmission(),
            mockDraft(),
        ]
        submissions[2].id = 'test-abc-122'
        submissions[2].name = 'MN-MSHO-0002' // the names collide otherwise

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexSubmissionsMockSuccess(submissions),
                ],
            },
        })

        // we want to check that there are three submissions and in the right order.
        const cardsList = await screen.findByTestId('submissions-list')
        expect(cardsList.children.length).toEqual(3)

        const links = within(cardsList).getAllByRole('link')
        expect(links.length).toEqual(3)

        const names = links.map((link) => link.textContent)

        expect(names).toEqual([
            'MN-MSHO-0001',
            'MN-MSHO-0002',
            'MN-MSHO-0003',
        ])

    })

    it('loads first tab active', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess(),
                ],
            },
        })

        await waitFor(() => {
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(3)
            expect(tabs[0]).toHaveClass('easi-tabs__tab--selected')
            expect(tabs[1]).not.toHaveClass('easi-tabs__tab--selected')
            expect(tabs[2]).not.toHaveClass('easi-tabs__tab--selected')
        })
    })

    it('on new submission click, redirect to /submissions/new', async () => {
        const history = createMemoryHistory()

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess(),
                ],
            },
            routerProvider: {
                routerProps: { history: history },
            },
        })

        await waitFor(() => {
            const links = screen.getAllByRole('link', {
                name: 'Start new submission',
            })
            expect(links).toBeDefined()
            userEvent.click(links[0])
        })

        await waitFor(() => {
            expect(history.location.pathname).toBe('/submissions/new')
        })
    })
    // Currently first tab and program is selected by default, adjust test when this is dynamic
    it('shows the success message if set', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissionsMockSuccess(),
                ],
            },
            routerProvider: {
                route: `dashboard?justSubmitted=MN-MSHO-0001`,
            },
        })

        await waitFor(() => {
            const title = screen.getByText('MN-MSHO-0001 was sent to CMS')
            expect(title).toBeInTheDocument()
        })
    })

    it('has a stable Draft sort', async () => {
        type TestCase = [
            { __typename: string; id: string; name: string }[],
            string | undefined,
            string[]
        ]
        const tests: TestCase[] = [
            [
                [
                    {
                        __typename: 'DraftSubmission',
                        id: '4',
                        name: 'MSHO-0005',
                    },
                    {
                        __typename: 'StateSubmission',
                        id: '3',
                        name: 'MSHO-0004',
                    },
                    {
                        __typename: 'DraftSubmission',
                        id: '2',
                        name: 'MSHO-0003',
                    },
                    {
                        __typename: 'StateSubmission',
                        id: '1',
                        name: 'MSHO-0002',
                    },
                    {
                        __typename: 'DraftSubmission',
                        id: '0',
                        name: 'MSHO-0001',
                    },
                ],
                undefined,
                ['4', '2', '0', '3', '1'],
            ],

            [
                [
                    {
                        __typename: 'DraftSubmission',
                        id: '4',
                        name: 'MSHO-0005',
                    },
                    {
                        __typename: 'StateSubmission',
                        id: '3',
                        name: 'MSHO-0004',
                    },
                    {
                        __typename: 'DraftSubmission',
                        id: '2',
                        name: 'MSHO-0003',
                    },
                    {
                        __typename: 'StateSubmission',
                        id: '1',
                        name: 'MSHO-0002',
                    },
                    {
                        __typename: 'DraftSubmission',
                        id: '0',
                        name: 'MSHO-0001',
                    },
                ],
                'MSHO-0002',
                ['1', '4', '2', '0', '3'],
            ],
        ]

        for (const test of tests) {
            sortDraftsToTop(test[0], test[1])
            expect(test[0].map((i) => i.id)).toStrictEqual(test[2])
        }
    })
})
