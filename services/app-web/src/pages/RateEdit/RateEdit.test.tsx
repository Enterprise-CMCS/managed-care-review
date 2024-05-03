import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../testHelpers'
import { RateEdit } from './RateEdit'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { RoutesRecord } from '../../constants'
import { Route, Routes } from 'react-router-dom'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route path={RoutesRecord.RATE_EDIT} element={children} />
        </Routes>
    )
}

describe('RateEdit', () => {
    afterAll(() => jest.clearAllMocks())

    describe('Viewing RateEdit as a state user', () => {
        it('renders without errors', async () => {
          renderWithProviders(wrapInRoutes(<RateEdit />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: '1337',
                            status: 'UNLOCKED',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337/edit',
                },
                featureFlags: {
                    'rate-edit-unlock': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.queryByTestId('single-rate-edit')
                ).toBeInTheDocument()
            })
        })

        it('validates for form fields but not for linked rate fields', async () => {
            const {user} = renderWithProviders(wrapInRoutes(<RateEdit />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: '1337',
                            status: 'UNLOCKED',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337/edit',
                },
                featureFlags: {
                    'rate-edit-unlock': true,
                },
            })

            await screen.findByTestId('single-rate-edit')
            await screen.findByText('Rate Details')
            expect(
                screen.queryByText(
                    'Was this rate certification included with another submission?'
                )
            ).not.toBeInTheDocument()

            // do nothing and try to continue to trigger validations
         await user.click(screen.getByRole('button', {
            name: 'Submit',
        }))

        // check that general form errors appear both in summary and inline
        await screen.findByTestId('error-summary')
        expect(screen.getAllByText('You must upload a rate certification')).toHaveLength(2)
        expect(screen.getAllByText('You must select a program')).toHaveLength(2)
        expect(screen.getAllByText('You must choose a rate certification type')).toHaveLength(2)
        expect(screen.getAllByText("You must select whether you're certifying rates or rate ranges")).toHaveLength(2)
        expect(screen.getAllByText('You must select an actuarial firm')).toHaveLength(2)
        // check that linked rates errors do not appear
        expect(screen.queryAllByText('You must select a rate certification')).toHaveLength(0)
        })
    })
})
