import { screen, within } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
    mockDraftHealthPlanPackage,
    mockSubmittedHealthPlanPackage,
    mockUnlockedHealthPlanPackage,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { CMSDashboard } from './CMSDashboard'

describe('CMSDashboard', () => {
    const mockUser = {
        __typename: 'CMSUser' as const,
        role: 'CMS User',
        name: 'Bob it user',
        email: 'bob@dmas.mn.gov',
    }

    it('displays submissions table', async () => {
        const submitted = mockSubmittedHealthPlanPackage()
        const unlocked = mockUnlockedHealthPlanPackage()
        submitted.id = 'test-submitted'
        unlocked.id = 'test-unlocked'
        const submissions = [submitted, unlocked]

        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })

        const rows = await screen.findAllByRole('row')
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(rows).toHaveLength(3)
    })

    it('displays submissions table sorted by updatedAt field', async () => {
        const submitted = mockSubmittedHealthPlanPackage()
        const unlocked2098 = mockUnlockedHealthPlanPackage({
            updatedAt: new Date('2098-01-01'),
        })
        const unlocked2100 = mockUnlockedHealthPlanPackage({
            updatedAt: new Date('2100-01-01'),
        })
        const unlocked2020 = mockUnlockedHealthPlanPackage({
            updatedAt: new Date('2020-01-01'),
        })
        submitted.id = 'test-abc-submitted'
        unlocked2098.id = 'test-abc-unlocked2098'
        unlocked2100.id = 'test-abc-unlocked2100'
        unlocked2020.id = 'test-abc-unlocked3'

        const submissions = [
            unlocked2098,
            submitted,
            unlocked2020,
            unlocked2100,
        ]

        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })

        const rows = await screen.findAllByRole('row') // remember, 0 index element is the table header

        const link1 = within(rows[1]).getByRole('link')
        expect(link1).toHaveAttribute('href', `/submissions/${unlocked2100.id}`)

        const link2 = within(rows[2]).getByRole('link')
        expect(link2).toHaveAttribute('href', `/submissions/${unlocked2098.id}`)

        const link3 = within(rows[3]).getByRole('link')
        expect(link3).toHaveAttribute('href', `/submissions/${submitted.id}`)

        const link4 = within(rows[4]).getByRole('link')
        expect(link4).toHaveAttribute('href', `/submissions/${unlocked2020.id}`)
    })

    it('displays submissions table excluding any in progress drafts', async () => {
        // set draft current revision to a far future updatedAt. Set unlocked to nearer future. This allows us to test sorting.
        const draft = mockDraftHealthPlanPackage()
        const submitted = mockSubmittedHealthPlanPackage()
        const unlocked = mockUnlockedHealthPlanPackage()
        draft.id = 'test-abc-draft'
        submitted.id = 'test-abc-submitted'
        unlocked.id = 'test-abc-unlocked'

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })

        const rows = await screen.findAllByRole('row')
        rows.shift() // remove the column header row

        // confirm initial draft packages don't display to CMS user
        expect(rows).toHaveLength(2)

        rows.forEach((row) => {
            const submissionLink = within(row).queryByRole('link')
            expect(submissionLink).not.toHaveAttribute(
                'href',
                `/submissions/${draft.id}`
            )
        })
    })

    it('displays each health plan package status tag as expected', async () => {
        const unlocked = mockUnlockedHealthPlanPackage()
        const submitted = mockSubmittedHealthPlanPackage()
        submitted.id = 'test-abc-submitted'
        unlocked.id = 'test-abc-unlocked'

        const submissions = [unlocked, submitted]
        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })

        const rows = await screen.findAllByRole('row')

        const tag1 = within(rows[1]).getByTestId('submission-status')
        expect(tag1).toHaveTextContent('Unlocked')

        const tag2 = within(rows[2]).getByTestId('submission-status')
        expect(tag2).toHaveTextContent('Submitted')
    })
})
