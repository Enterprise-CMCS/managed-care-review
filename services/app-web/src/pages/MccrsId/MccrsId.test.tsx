import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    ldUseClientSpy,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'
import { MccrsId } from './MccrsId'

describe('MCCRSID', () => {
    beforeEach(() => {
        ldUseClientSpy({ 'cms-questions': false })
    })
    afterEach(() => {
        jest.resetAllMocks()
    })

    it('renders without errors', async () => {
        renderWithProviders(<MccrsId />, {
            routerProvider: {
                route: '/submissions/15/MCCRS-record-number',
            },
        })

        expect(
            await screen.findByRole('heading', { name: 'MC-CRS record number' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Save MC-CRS number' })
        ).not.toHaveAttribute('aria-disabled')
    })

    it('displays the text field for mccrs id', async () => {
        renderWithProviders(<MccrsId />, {
            routerProvider: {
                route: '/submissions/15/MCCRS-record-number',
            },
        })

        expect(screen.getByTestId('textInput')).toBeInTheDocument()
    })

    it('cannot continue without providing a MCCRS ID', async () => {
        renderWithProviders(<MccrsId />, {
            routerProvider: {
                route: '/submissions/15/MCCRS-record-number',
            },
        })
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText(
                    'You must enter a record number or delete this field.'
                )
            ).toHaveLength(1)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue with MCCRS ID less than 4 digits', async () => {
        renderWithProviders(<MccrsId />, {
            routerProvider: {
                route: '/submissions/15/MCCRS-record-number',
            },
        })

        screen
            .getByLabelText(
                'Enter the Managed Care Contract and Rate Review System (MC-CRS) record number.'
            )
            .focus()
        await userEvent.paste('123')
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText(
                    'You must enter no more than [4] characters'
                )
            ).toHaveLength(1)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue with MCCRS ID more than 4 digits', async () => {
        renderWithProviders(<MccrsId />, {
            routerProvider: {
                route: '/submissions/15/MCCRS-record-number',
            },
        })

        screen
            .getByLabelText(
                'Enter the Managed Care Contract and Rate Review System (MC-CRS) record number.'
            )
            .focus()
        await userEvent.paste('12345')
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText(
                    'You must enter no more than [4] characters'
                )
            ).toHaveLength(1)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue with MCCRS ID with non number input', async () => {
        renderWithProviders(<MccrsId />, {
            routerProvider: {
                route: '/submissions/15/MCCRS-record-number',
            },
        })

        screen
            .getByLabelText(
                'Enter the Managed Care Contract and Rate Review System (MC-CRS) record number.'
            )
            .focus()
        await userEvent.paste('123a')
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(screen.getAllByText('You must enter a number')).toHaveLength(
                1
            )
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })
})
