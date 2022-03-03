import React from 'react'
import { screen, waitFor, within } from '@testing-library/react'

import { Dashboard } from './Dashboard'
import {
    fetchCurrentUserMock,
    indexSubmissions2MockSuccess,
    mockDraftSubmission2,
    mockSubmittedSubmission2,
    mockUnlockedSubmission2
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('Dashboard', () => {
    it('display submission heading', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexSubmissions2MockSuccess(),
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
                    indexSubmissions2MockSuccess(),
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
                    { id: 'msho', name: 'MSHO' },
                    { id: 'pmap', name: 'PMAP' },
                    { id: 'snbc', name: 'SNBC' },
                ],
            },
            role: 'State User',
            name: 'Bob it user',
            email: 'bob@dmas.mn.gov',
        }
        const draft = mockDraftSubmission2()
        const submitted = mockSubmittedSubmission2()
        const unlocked = mockUnlockedSubmission2()
        
        const submissions = [draft, submitted, unlocked]

        // TODO - Figure this test mocking out

        // submissions[2].id = 'test-abc-122'
        // submissions[2].name = 'MN-MSHO-0002' // the names collide otherwise
        // // set middle row to latest updatedAt to test sorting (it should be sorted to top)
        // submissions[1].updatedAt = '2100-01-01T00:00:00.000Z'

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexSubmissions2MockSuccess(submissions),
                ],
            },
        })

        // we want to check that there's a table with three submissions, sorted by `updatedAt`.
        const rows = await screen.findAllByRole('row')
        expect(rows[1]).toHaveTextContent('MSHO-0001')
        const link1 = within(rows[1]).getByRole('link')
        expect(link1).toHaveAttribute('href', '/submissions/test-abc-123/type')
        expect(rows[2]).toHaveTextContent('MSHO-0003')
        const link2 = within(rows[2]).getByRole('link')
        expect(link2).toHaveAttribute('href', '/submissions/test-abc-125')
        expect(rows[3]).toHaveTextContent('MSHO-0002')
        const link3 = within(rows[3]).getByRole('link')
        expect(link3).toHaveAttribute('href', '/submissions/test-abc-122/review-and-submit')
    })
})
