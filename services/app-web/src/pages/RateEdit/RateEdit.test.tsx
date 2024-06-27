import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, updateDateRange } from '../../testHelpers'
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
            const { user } = renderWithProviders(wrapInRoutes(<RateEdit />), {
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

            // delete some fields so we trigger validations
            const startDateInput = screen.getAllByLabelText('Start date')
            const endDateInput = screen.getAllByLabelText('End date')
            await updateDateRange({
                start: { elements: startDateInput, date: 'abc' },
                end: { elements: endDateInput, date: 'abc' },
            })
            await user.click(
                screen.getByRole('button', {
                    name: 'Remove rate-document.pdf document',
                })
            )
            screen.debug()
            await user.click(
                screen.getByRole('button', {
                    name: 'Submit',
                })
            )

            await screen.findByTestId('error-summary')
            expect(
                screen.getAllByText('The end date must be in MM/DD/YYYY format')
            ).toHaveLength(1) // we show only start date error messages inline if both fields have errors, see RateDatesErrorMessage
            expect(
                screen.getAllByText(
                    'The start date must be in MM/DD/YYYY format'
                )
            ).toHaveLength(2)
            // check that linked rates errors do not appear
            expect(
                screen.queryAllByText('You must select a rate certification')
            ).toHaveLength(0)
        })
    })
})
