import { screen, within } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
    mockDraftHealthPlanPackage,
    mockMNState,
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
    it('should display cms dashboard page', async () => {
        const screen = renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess([]),
                ],
            },
        })
        await expect(screen.findByTestId('cms-dashboard-page')).not.toBeNull()
    })

    it('displays no submission text when no submitted packages exist', async () => {
        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess([]),
                ],
            },
        })
        await screen.findByText('Submissions')
        expect(screen.queryByRole('table')).toBeNull()
        expect(
            screen.getByText(/You have no submissions yet/)
        ).toBeInTheDocument()
    })

    it('displays submissions table when submitted packages exist', async () => {
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

        await screen.findByText('Submissions')
        const rows = await screen.findAllByRole('row')
        expect(screen.getByRole('table')).toBeInTheDocument()

        expect(rows).toHaveLength(3)
    })

    it('displays submissions table with expected headers', async () => {
        const submitted = mockSubmittedHealthPlanPackage()
        const submissions = [submitted]

        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })

        await screen.findByText('Submissions')
        const table = screen.getByRole('table')
        const [columnNames] = within(table).getAllByRole('rowgroup')
        expect(within(columnNames).getByText(/ID/)).toBeTruthy()
        expect(within(columnNames).getByText(/State/)).toBeTruthy()
        expect(within(columnNames).getByText(/Submission type/)).toBeTruthy()
        expect(within(columnNames).getByText(/Programs/)).toBeTruthy()
        expect(within(columnNames).getByText(/Submission date/)).toBeTruthy()
        expect(within(columnNames).getByText(/Status/)).toBeTruthy()
    })

    it('displays submissions table excluding any in progress drafts', async () => {
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

        await screen.findByText('Submissions')
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

    it('displays submissions table sorted by that revisions last updated column', async () => {
        const submitted1 = mockSubmittedHealthPlanPackage(
            {},
            { updatedAt: new Date() }
        )
        const unlocked2008 = mockUnlockedHealthPlanPackage(
            {},
            {
                updatedAt: new Date('2008-01-01'),
            }
        )
        const unlocked2009 = mockUnlockedHealthPlanPackage(
            {},
            { updatedAt: new Date('2009-01-01') }
        )
        const unlockedToday = mockUnlockedHealthPlanPackage(
            {},
            {
                updatedAt: new Date(), // this will be most recent unlock
            }
        )

        const submitted2 = mockSubmittedHealthPlanPackage(
            {},
            { updatedAt: new Date() }
        ) // this will be most recent submitted, and also the very top of the list

        submitted1.id = 'test-abc-submitted'
        submitted2.id = 'test-abc-submitted-most-recent'
        unlocked2008.id = 'test-abc-unlocked2098'
        unlocked2009.id = 'test-abc-unlocked2100'
        unlockedToday.id = 'test-abc-unlocked-top-of-list'

        // intentionally listed in a scrambled order to test sorting
        const submissions = [
            submitted1,
            unlocked2008,
            submitted2,
            unlockedToday,
            unlocked2009,
        ]

        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })
        await screen.findByText('Submissions')
        const rows = await screen.findAllByRole('row') // remember, 0 index element is the table header

        const link1 = within(rows[1]).getByRole('link')
        console.log(JSON.stringify(submitted1.revisions[0]))
        console.log(JSON.stringify(submitted2.revisions[0]))
        expect(link1).toHaveAttribute('href', `/submissions/${submitted2.id}`)

        const link2 = within(rows[2]).getByRole('link')
        expect(link2).toHaveAttribute(
            'href',
            `/submissions/${unlockedToday.id}`
        )

        const link3 = within(rows[3]).getByRole('link')
        expect(link3).toHaveAttribute('href', `/submissions/${submitted1.id}`)

        const link4 = within(rows[4]).getByRole('link')
        expect(link4).toHaveAttribute('href', `/submissions/${unlocked2009.id}`)

        const link5 = within(rows[5]).getByRole('link')
        expect(link5).toHaveAttribute('href', `/submissions/${unlocked2008.id}`)
    })

    it('displays submission type as expected for current revision that is submitted/resubmitted', async () => {
        const submitted = mockSubmittedHealthPlanPackage()
        submitted.id = '123-4'
        const submissions = [submitted]
        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockUser,
                    }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })
        await screen.findByText('Submissions')
        const row = await screen.findByTestId(`row-${submitted.id}`)
        const submissionType = within(row).getByTestId('submission-type')
        expect(submissionType).toHaveTextContent('Contract action only')
    })

    it('displays each health plan package status tag as expected for current revision that is submitted/resubmitted', async () => {
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
        await screen.findByText('Submissions')
        const unlockedRow = await screen.findByTestId(`row-${unlocked.id}`)
        const tag1 = within(unlockedRow).getByTestId('submission-status')
        expect(tag1).toHaveTextContent('Unlocked')

        const submittedRow = await screen.findByTestId(`row-${submitted.id}`)
        const tag2 = within(submittedRow).getByTestId('submission-status')
        expect(tag2).toHaveTextContent('Submitted')
    })

    it('displays the expected program tags for current revision that is submitted/resubmitted', async () => {
        const mockUser = {
            __typename: 'CMSUser' as const,
            role: 'CMS User',
            name: 'Bob it user',
            email: 'bob@dmas.mn.gov',
        }

        const mockMN = mockMNState() // this is the state used in apolloHelpers
        const submitted1 = mockSubmittedHealthPlanPackage({
            programIDs: [mockMN.programs[0].id],
        })
        const submitted2 = mockSubmittedHealthPlanPackage({
            updatedAt: new Date('2298-01-01'),
            programIDs: [
                mockMN.programs[0].id,
                mockMN.programs[1].id,
                mockMN.programs[2].id,
            ],
        })

        submitted1.id = 'test-submitted1'
        submitted2.id = 'test-submitted2'

        const submissions = [submitted1, submitted2]

        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })
        await screen.findByText('Submissions')
        const row1 = await screen.findByTestId(`row-${submitted1.id}`)
        const tags1 = within(row1).getAllByTestId('program-tag')
        expect(tags1[0]).toHaveTextContent(mockMN.programs[0].name)
        expect(tags1).toHaveLength(1)

        const row2 = await screen.findByTestId(`row-${submitted2.id}`)
        const tags2 = within(row2).getAllByTestId('program-tag')
        expect(tags2).toHaveLength(3)
        expect(tags2[0]).toHaveTextContent(mockMN.programs[0].name)
        expect(tags2[1]).toHaveTextContent(mockMN.programs[1].name)
        expect(tags2[2]).toHaveTextContent(mockMN.programs[2].name)
    })

    it('displays name, type, programs and last update based on previously submitted revision for UNLOCKED package', async () => {
        const mockMN = mockMNState() // this is the state used in apolloHelpers

        // Set new data on the unlocked form. This would be a state users update and the CMS user should not see this data.
        const unlocked = mockUnlockedHealthPlanPackage(
            {
                submissionType: 'CONTRACT_ONLY',
                updatedAt: new Date('2022-01-15'),
                programIDs: [mockMN.programs[2].id],
            },
            { updatedAt: new Date('2022-01-22') }
        )
        unlocked.id = 'test-state-edit-in-progress-unlocked'

        const submissions = [unlocked]
        renderWithProviders(<CMSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexHealthPlanPackagesMockSuccess(submissions),
                ],
            },
        })
        await screen.findByText('Submissions')
        const unlockedRow = await screen.findByTestId(`row-${unlocked.id}`)

        // Confirm UNLOCKED status
        const tag1 = within(unlockedRow).getByTestId('submission-status')
        expect(tag1).toHaveTextContent('Unlocked')

        // Confirm we are using previous submitted revision type
        const submissionType =
            within(unlockedRow).getByTestId('submission-type')
        expect(submissionType).toHaveTextContent(
            'Contract action and rate certification'
        )

        const submissionPrograms =
            within(unlockedRow).getAllByTestId('program-tag')
        // Confirm we are using previous submitted revision programs
        expect(submissionPrograms).toHaveLength(3)
        const submissionNameLink =
            within(unlockedRow).getByTestId('submission-id')
        expect(submissionNameLink).toHaveTextContent('MSC+-PMAP-SNBC')

        // Confirm we are using updated at from the previous submitted revision unlock info
        const lastUpdated = within(unlockedRow).getByTestId(
            'submission-last-updated'
        )
        expect(lastUpdated).toHaveTextContent('01/22/2022')
    })
})
