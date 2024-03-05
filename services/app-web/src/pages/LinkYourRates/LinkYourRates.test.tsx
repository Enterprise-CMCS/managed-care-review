import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    indexRatesMockSuccess,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { LinkYourRates } from './LinkYourRates'
import { Formik } from 'formik'

describe('LinkYourRates', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Formik
                initialValues={{ ratePreviouslySubmitted: '' }}
                onSubmit={(values) => console.info('submitted', values)}
            >
                <form>
                    <LinkYourRates />
                </form>
            </Formik>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        indexRatesMockSuccess(),
                    ],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()
        })
    })

    it('does not display dropdown menu if no is selected', async () => {
        renderWithProviders(
            <Formik
                initialValues={{ ratePreviouslySubmitted: '' }}
                onSubmit={(values) => console.info('submitted', values)}
            >
                <form>
                    <LinkYourRates />
                </form>
            </Formik>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        indexRatesMockSuccess(),
                    ],
                },
            }
        )

        screen
            .getByLabelText(
                'No, this rate certification was not included with any other submissions'
            )
            .click()

        await waitFor(() => {
            expect(
                screen.queryByText('Which rate certification was it?')
            ).not.toBeInTheDocument()
        })
    })

    it('displays dropdown menu if yes is selected', async () => {
        renderWithProviders(
            <Formik
                initialValues={{ ratePreviouslySubmitted: '' }}
                onSubmit={(values) => console.info('submitted', values)}
            >
                <form>
                    <LinkYourRates />
                </form>
            </Formik>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        indexRatesMockSuccess(),
                    ],
                },
            }
        )

        screen
            .getByLabelText(
                'Yes, this rate certification is part of another submission'
            )
            .click()

        await waitFor(() => {
            expect(
                screen.queryByText('Which rate certification was it?')
            ).toBeInTheDocument()
        })
    })
})
