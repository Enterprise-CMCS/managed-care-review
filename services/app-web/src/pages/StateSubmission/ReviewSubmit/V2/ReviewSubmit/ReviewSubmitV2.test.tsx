import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
} from '../../../../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ReviewSubmitV2 } from './ReviewSubmitV2'
import { fetchContractMockSuccess } from '../../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../../../constants'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                element={
                    <ReviewSubmitV2/>
                }
            />
        </Routes>
    )
}

describe.skip('ReviewSubmit', () => {
    it.skip('renders without errors', async () => {
        renderWithProviders(wrapInRoutes(<ReviewSubmitV2 />),
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({ contract: { id: 'test-abc-123' } }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                }
            })
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', { name: 'Contract details' })
                ).toBeInTheDocument()  
            })
         
    })

    it.skip('displays edit buttons for every section', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

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

    it.skip('does not display zip download buttons', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            const bulkDownloadButtons = screen.queryAllByRole('button', {
                name: /documents/,
            })
            expect(bulkDownloadButtons).toHaveLength(0)
        })
    })

    it.skip('renders info from a DraftSubmission', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

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

    it.skip('displays back and save as draft buttons', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

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

    it.skip('displays submit button', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(screen.getByTestId('form-submit')).toBeDefined()
        )
    })
})