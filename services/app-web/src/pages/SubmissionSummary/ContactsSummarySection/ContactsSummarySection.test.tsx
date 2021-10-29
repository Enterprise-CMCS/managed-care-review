import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ContactsSummarySection } from './'
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
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('can render all state and actuary contact fields', () => {
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
        expect(screen.queryByText('Contact 1')).toBeInTheDocument()
        // expect(screen.queryByText('State Contact 1')).toBeInTheDocument()
        // expect(screen.queryByText('Test State Contact 1')).toBeInTheDocument()
        expect(
            screen.getByRole('link', {
                name: 'statecontact1@test.com',
            })
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Actuary contacts',
            })
        ).toBeInTheDocument()
        expect(screen.queryByText('Certifying actuary')).toBeInTheDocument()
        // expect(screen.queryByText('Actuary Contact 1')).toBeInTheDocument()
        // expect(screen.queryByText('Test Actuary Contact 1')).toBeInTheDocument()
        expect(
            screen.getByRole('link', {
                name: 'actuarycontact1@test.com',
            })
        ).toBeInTheDocument()
        // expect(screen.queryByText('Deloitte')).toBeInTheDocument()
        expect(
            screen.queryByText('Actuary communication preference')
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                'The CMS Office of the Actuary can communicate directly with the state’s actuary but should copy the state on all written communication and all appointments for verbal discussions.'
            )
        ).toBeInTheDocument()
    })

    it('can render only state contacts for contract only submission', () => {
        renderWithProviders(
            <ContactsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'State contacts',
            })
        ).toBeInTheDocument()

        expect(screen.queryByText('Actuary contacts')).not.toBeInTheDocument()
    })
})
