import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { SubmissionWithdrawWarningBanner } from './SubmissionWithdrawWarningBanner'

const ratesToNotBeWithdrawn = [
    {
        rateName: 'MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240102',
        rateURL: '/rates/48209975-bad4-43e4-a9f7-0c2e5efd281b',
    },
    {
        rateName: 'MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240103',
        rateURL: '/rates/c6c08c90-9eb6-42b8-a1f5-19ce9b453299',
    },
]

test('renders submission withdraw warning banner without errors', () => {
    renderWithProviders(
        <SubmissionWithdrawWarningBanner rates={ratesToNotBeWithdrawn} />
    )

    expect(screen.getByTestId('withdrawSubmissionBanner')).toBeInTheDocument()
    expect(
        screen.getByText('Rate on multiple contract actions')
    ).toBeInTheDocument()
    expect(
        screen.getByText(
            'Withdrawing this submission will not withdraw the following rate(s) that are on multiple contract actions:'
        )
    ).toBeInTheDocument()
    expect(
        screen.getByText('MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240102')
    ).toBeInTheDocument()
    expect(
        screen.getByText('MCR-FL-NEMTMTM-20240201-20250201-AMENDMENT-20240103')
    ).toBeInTheDocument()
})
