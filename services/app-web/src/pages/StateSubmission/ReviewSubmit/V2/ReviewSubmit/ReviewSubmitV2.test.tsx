import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    // mockContractAndRatesDraftV2,
} from '../../../../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ReviewSubmitV2 } from './ReviewSubmitV2'
import * as useRouteParams from '../../../../../hooks/useRouteParams'
import * as useHealthPlanPackageForm from '../../../../../hooks/useHealthPlanPackageForm'
import { useFetchContractQuery } from '../../../../../gen/gqlClient'
import { fetchContractMockSuccess } from '../../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../../../constants'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT_V2}
                element={
                    <ReviewSubmitV2/>
                }
            />
        </Routes>
    )
}

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(wrapInRoutes(<ReviewSubmitV2 />),
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({ contract: { id: 'test-abc-123' } }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit-v2',
                }
            })
        expect(
            // await screen.findByText('Contract details')
            await screen.getByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()    
    })

    // it('displays edit buttons for every section', async () => {
    //     renderWithProviders(<ReviewSubmit />, {
    //         apolloProvider: {
    //             mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    //         },
    //     })

    //     await waitFor(() => {
    //         const sectionHeadings = screen.queryAllByRole('heading', {
    //             level: 2,
    //         })
    //         const editButtons = screen.queryAllByRole('button', {
    //             name: 'Edit',
    //         })
    //         expect(sectionHeadings.length).toBeGreaterThanOrEqual(
    //             editButtons.length
    //         )
    //     })
    // })

    // it('does not display zip download buttons', async () => {
    //     renderWithProviders(<ReviewSubmit />, {
    //         apolloProvider: {
    //             mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    //         },
    //     })

    //     await waitFor(() => {
    //         const bulkDownloadButtons = screen.queryAllByRole('button', {
    //             name: /documents/,
    //         })
    //         expect(bulkDownloadButtons).toHaveLength(0)
    //     })
    // })

    // it('renders info from a DraftSubmission', async () => {
    //     renderWithProviders(<ReviewSubmit />, {
    //         apolloProvider: {
    //             mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    //         },
    //     })

    //     await waitFor(() => {
    //         expect(
    //             screen.getByRole('heading', { name: 'Contract details' })
    //         ).toBeInTheDocument()

    //         expect(
    //             screen.getByRole('heading', { name: 'State contacts' })
    //         ).toBeInTheDocument()

    //         const sectionHeadings = screen.queryAllByRole('heading', {
    //             level: 2,
    //         })
    //         const editButtons = screen.queryAllByRole('button', {
    //             name: 'Edit',
    //         })
    //         expect(sectionHeadings.length).toBeGreaterThanOrEqual(
    //             editButtons.length
    //         )

    //         const submissionDescription =
    //             screen.queryByText('A real submission')
    //         expect(submissionDescription).toBeInTheDocument()
    //     })
    // })

    // it('displays back and save as draft buttons', async () => {
    //     renderWithProviders(<ReviewSubmit />, {
    //         apolloProvider: {
    //             mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    //         },
    //     })

    //     await waitFor(() =>
    //         expect(
    //             screen.getByRole('button', {
    //                 name: 'Back',
    //             })
    //         ).toBeDefined()
    //     )
    //     await waitFor(() =>
    //         expect(
    //             screen.getByRole('button', {
    //                 name: 'Save as draft',
    //             })
    //         ).toBeDefined()
    //     )
    // })

    // it('displays submit button', async () => {
    //     renderWithProviders(<ReviewSubmit />, {
    //         apolloProvider: {
    //             mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    //         },
    //     })

    //     await waitFor(() =>
    //         expect(screen.getByTestId('form-submit')).toBeDefined()
    //     )
    // })
})
