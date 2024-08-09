import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, } from '../../testHelpers'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    mockValidAdminUser,
    fetchContractMockSuccess,
    mockContractPackageSubmitted,
    indexRatesMockSuccess
} from '../../testHelpers/apolloMocks'
import { RoutesRecord } from '../../constants'
import { Location, Route, Routes } from 'react-router-dom'
import { ReplaceRate } from './ReplaceRate'
import userEvent from '@testing-library/user-event'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
               <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<div>Summary page placeholder</div>}
                    />
            <Route path={RoutesRecord.REPLACE_RATE} element={children} />
        </Routes>
    )
}

describe('ReplaceRate', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })


    it('does not render for CMS user', async () => {
        const contract = mockContractPackageSubmitted()
        renderWithProviders(wrapInRoutes(<ReplaceRate />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchContractMockSuccess({ contract})
                ],
            },
            routerProvider: {
                route: `/submissions/${contract.id}/replace-rate/${contract.packageSubmissions[0].rateRevisions[0].rateID}`,
            },
        })

        const forbidden = await screen.findByText('You do not have permission to view the requested file or resource.')
        expect(forbidden).toBeInTheDocument()
    })


    it('renders without errors for admin user', async () => {
        const contract = mockContractPackageSubmitted()
        renderWithProviders(wrapInRoutes(<ReplaceRate />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchContractMockSuccess({ contract}),
                    indexRatesMockSuccess()
                ],
            },
            routerProvider: {
                route: `/submissions/${contract.id}/replace-rate/${contract.packageSubmissions[0].rateRevisions[0].rateID}`,
            },
        })

        await screen.findByRole('form')
        expect(
           screen.getByRole('heading', { name: 'Replace a rate review' })
        ).toBeInTheDocument()
        expect(
           screen.getByRole('form', {name: 'Withdraw and replace rate on contract'})
        ).toBeInTheDocument()
        expect(
           screen.getByRole('textbox', {name: 'Reason for revoking'})
        ).toBeInTheDocument()
        expect(
           screen.getByText('Select a replacement rate')).toBeInTheDocument()
        expect(
           screen.getByRole('button', {name: 'Replace rate'})
        ).toBeInTheDocument()
    })


    it('cancel button moves admin user back to parent contract summary', async () => {
        let testLocation: Location // set up location to track URL change
        const contract = mockContractPackageSubmitted()
        renderWithProviders(wrapInRoutes(<ReplaceRate />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchContractMockSuccess({ contract}),
                    indexRatesMockSuccess()
                ],
            },
            routerProvider: {
                route: `/submissions/${contract.id}/replace-rate/${contract.packageSubmissions[0].rateRevisions[0].rateID}`,
            },
            location: (location) => (testLocation = location),
        })
      await screen.findByRole('form')
      await userEvent.click(screen.getByText('Cancel'))
      await waitFor(() => {
        expect(testLocation.pathname).toBe(
            `/submissions/${contract.id}`
        )
    })

    })
})
