import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    fetchCurrentUserMock,
} from '../../../testHelpers/apolloHelpers'

import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { RateDetails } from './RateDetails'

describe('RateDetails', () => {
    it('renders without errors', async () => {
        const mock = mockDraft()
        const emptyRateDetailsDraft = {
            ...mock,
            rateType: null,
            rateDateStart: null,
            rateDateEnd: null,
            rateDateCertified: null,
        }

        renderWithProviders(
            <RateDetails draftSubmission={emptyRateDetailsDraft} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(
            await screen.findByRole('heading', { name: 'Rate details' })
        ).toBeInTheDocument()
    })

    it('loads with only rate type form field visible', async () => {
        const mock = mockDraft()
        const emptyRateDetailsDraft = {
            ...mock,
            rateType: null,
            rateDateStart: null,
            rateDateEnd: null,
            rateDateCertified: null,
        }

        renderWithProviders(
            <RateDetails draftSubmission={emptyRateDetailsDraft} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(screen.getByText('Rate certification type')).toBeInTheDocument()
        expect(
            screen.getByRole('radio', { name: 'New rate certification' })
        ).not.toBeChecked()
        expect(
            screen.getByRole('radio', {
                name: 'Amendment to prior rate certification',
            })
        ).not.toBeChecked()
        expect(screen.getAllByRole('radio').length).toBe(2)

        // should not be able to find hidden things
        expect(screen.queryByText('Start date')).toBeNull()
        expect(screen.queryByText('End date')).toBeNull()
        expect(screen.queryByText('Date certified')).toBeNull()
    })

    it('cannot continue without selecting rate type', async () => {
        const mock = mockDraft()
        const emptyRateDetailsDraft = {
            ...mock,
            rateType: null,
            rateDateStart: null,
            rateDateEnd: null,
            rateDateCertified: null,
        }

        renderWithProviders(
            <RateDetails draftSubmission={emptyRateDetailsDraft} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await continueButton.click()
        await waitFor(() => {
            expect(
                screen.getByText('You must choose a rate certification type')
            ).toBeInTheDocument()
            expect(continueButton).toBeDisabled()
        })
    })

    it('progressively disclose new rate form fields as expected', async () => {
        const mock = mockDraft()
        const emptyRateDetailsDraft = {
            ...mock,
            rateType: null,
            rateDateStart: null,
            rateDateEnd: null,
            rateDateCertified: null,
        }

        renderWithProviders(
            <RateDetails draftSubmission={emptyRateDetailsDraft} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(screen.getByText('Rate certification type')).toBeInTheDocument()
        screen.getByLabelText('New rate certification').click()

        // check that now we can see hidden things
        await waitFor(() => {
            expect(screen.queryByText('Rating period')).toBeInTheDocument()
            expect(screen.queryByText('Start date')).toBeInTheDocument()
            expect(screen.queryByText('End date')).toBeInTheDocument()
            expect(screen.queryByText('Date certified')).toBeInTheDocument()
            expect(screen.queryAllByTestId('errorMessage').length).toBe(0)
        })
        // click "continue"
        const continueButton = screen.getByRole('button', { name: 'Continue' })

        continueButton.click()

        // check for expected errors
        await waitFor(() => {
            expect(screen.queryAllByTestId('errorMessage').length).toBe(2)
            expect(
                screen.queryByText(
                    'You must enter the date the document was certified'
                )
            ).toBeInTheDocument()
            expect(
                screen.queryByText('You must provide a start and an end date')
            ).toBeInTheDocument()
        })

        // fill out form and clear errors
        userEvent.type(screen.getByText('Start date'), '01/01/2022')
        userEvent.type(screen.getByText('End date'), '01/01/2023')
        userEvent.type(screen.getByText('Date certified'), '12/01/2021')
        await waitFor(() =>
            expect(screen.queryAllByTestId('errorMessage').length).toBe(0)
        )
    })
})
