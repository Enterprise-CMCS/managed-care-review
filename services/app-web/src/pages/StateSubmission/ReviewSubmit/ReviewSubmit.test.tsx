import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    mockCompleteDraft,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ReviewSubmit } from './ReviewSubmit'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <ReviewSubmit
                draftSubmission={mockCompleteDraft()}
                unlocked={false}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        expect(
            screen.getByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
    })

    it('displays edit buttons for every section', async () => {
        renderWithProviders(
            <ReviewSubmit
                draftSubmission={mockCompleteDraft()}
                unlocked={false}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
        })
    })

    it('does not display zip download buttons', async () => {
        renderWithProviders(
            <ReviewSubmit
                draftSubmission={mockCompleteDraft()}
                unlocked={false}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            const bulkDownloadButtons = screen.queryAllByRole('button', {
                name: /documents/,
            })
            expect(bulkDownloadButtons).toHaveLength(0)
        })
    })

    it('renders info from a DraftSubmission', async () => {
        renderWithProviders(
            <ReviewSubmit
                draftSubmission={mockCompleteDraft()}
                unlocked={false}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
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

    it('displays back and save as draft buttons', async () => {
        renderWithProviders(
            <ReviewSubmit
                draftSubmission={mockCompleteDraft()}
                unlocked={false}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Back',
                })
            ).toBeDefined()
        )
        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Save as draft',
                })
            ).toBeDefined()
        )
    })

    it('displays submit button', async () => {
        renderWithProviders(
            <ReviewSubmit
                draftSubmission={mockCompleteDraft()}
                unlocked={false}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(screen.getByTestId('form-submit')).toBeDefined()
        )
    })
})
