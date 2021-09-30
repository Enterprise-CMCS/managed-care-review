import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ContactsSummarySection } from './ContactsSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('ContactsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <ContactsSummarySection
                submission={draftSubmission}
                navigateTo="contacts"
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'State contacts',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Actuary contacts',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit State contacts' })
        ).toHaveAttribute('href', '/contacts')
    })

    it('can render state submission without errors', () => {
        renderWithProviders(
            <ContactsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'State contacts',
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
})
