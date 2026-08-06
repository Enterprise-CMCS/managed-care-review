import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../testHelpers'
import { RateEdit } from './RateEdit'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockValidStateUser,
} from '@mc-review/mocks'
import { RoutesRecord } from '@mc-review/constants'
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
    afterAll(() => vi.clearAllMocks())

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
                    'contact-data-model-update': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.queryByTestId('single-rate-edit')
                ).toBeInTheDocument()
                expect(
                    screen.getByTestId('actuaryContacts.givenName')
                ).toHaveValue('Actuary')
                expect(
                    screen.getByTestId('actuaryContacts.familyName')
                ).toHaveValue('Contact')
                expect(
                    screen.getByTestId('actuaryContacts.suffix')
                ).toHaveValue('Person')
                expect(
                    screen.queryByTestId('actuaryContacts.name')
                ).not.toBeInTheDocument()
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
                    'contact-data-model-update': true,
                },
            })

            await screen.findByTestId('single-rate-edit')
            await screen.findByText('Rate Details')
            const actuaryFirstNameInput = screen.getByTestId(
                'actuaryContacts.givenName'
            )
            const actuaryLastNameInput = screen.getByTestId(
                'actuaryContacts.familyName'
            )
            const actuarySuffixInput = screen.getByTestId(
                'actuaryContacts.suffix'
            )
            expect(
                screen.queryByText(
                    'Was this rate certification included with another submission?'
                )
            ).not.toBeInTheDocument()
            expect(actuaryFirstNameInput).toBeInTheDocument()
            expect(actuaryLastNameInput).toBeInTheDocument()
            expect(actuarySuffixInput).toBeInTheDocument()

            await user.clear(actuaryFirstNameInput)
            await user.clear(actuaryLastNameInput)
            await user.click(
                screen.getByRole('button', {
                    name: 'Remove rate-document.pdf document',
                })
            )
            await user.click(
                screen.getByRole('button', {
                    name: 'Submit',
                })
            )

            await screen.findByTestId('error-summary')
            expect(
                screen.getAllByText('You must provide a first name')
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must provide a last name')
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must upload a rate certification')
            ).toHaveLength(2)
            expect(screen.getAllByTestId('error-summary-message')).toHaveLength(
                3
            )
            // check that linked rates errors do not appear
            expect(
                screen.queryAllByText('You must select a rate certification')
            ).toHaveLength(0)
        })
    })
})
