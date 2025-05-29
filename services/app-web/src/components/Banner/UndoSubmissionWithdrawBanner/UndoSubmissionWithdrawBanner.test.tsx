import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { UndoSubmissionWithdrawBanner } from './UndoSubmissionWithdrawBanner'

const updateInfo = {
    updatedAt: new Date('2025-04-10'),
    updatedBy: {
        email: 'zuko@example.com',
        role: 'CMS_USER',
        familyName: 'Hotman',
        givenName: 'Zuko',
    },
    updatedReason: 'CMS reinstated this submission from review. banner test',
}

test('renders submission withdraw success banner without errors', () => {
    renderWithProviders(
        <UndoSubmissionWithdrawBanner undoWithdrawInfo={updateInfo} />
    )

    expect(
        screen.getByTestId('undoWithdrawSubmissionBanner')
    ).toBeInTheDocument()
    expect(screen.getByText('Status Updated')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('zuko@example.com')).toBeInTheDocument()
    expect(screen.getByText('04/09/2025 5:00pm PT')).toBeInTheDocument()
    expect(
        screen.getByText(
            'CMS reinstated this submission from review. banner test'
        )
    ).toBeInTheDocument()
})
