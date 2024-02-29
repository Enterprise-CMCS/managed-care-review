import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ContactsSummarySection } from './ContactsSummarySectionV2'
import {
    mockContractAndRatesDraftV2,
    mockContractAndRatesSubmittedV2
} from '../../../../../testHelpers/apolloMocks'

describe('ContactsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraftV2()
    const stateSubmission = mockContractAndRatesSubmittedV2()
    afterEach(() => jest.clearAllMocks())

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <ContactsSummarySection
                contract={draftSubmission}
                editNavigateTo="contacts"
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
                name: 'Additional actuary contacts',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit State contacts' })
        ).toHaveAttribute('href', '/contacts')
    })

    it('can render state submission without errors', () => {
        renderWithProviders(
            <ContactsSummarySection contract={stateSubmission} />
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
                contract={draftSubmission}
                editNavigateTo="contacts"
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
            screen.getByRole('heading', {
                level: 2,
                name: 'Additional actuary contacts',
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByText('Additional actuary contact')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', {
                name: 'additionalactuarycontact1@test.com',
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByText('Actuaries’ communication preference')
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                'OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.'
            )
        ).toBeInTheDocument()
    })

    it('can render only state contacts for contract only submission', () => {
        stateSubmission.packageSubmissions[0].contractRevision.formData = {
            ...stateSubmission.packageSubmissions[0].contractRevision.formData,
            submissionType: 'CONTRACT_ONLY',
        }
        renderWithProviders(
            <ContactsSummarySection
                contract={stateSubmission}
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'State contacts',
            })
        ).toBeInTheDocument()

        expect(screen.queryByText('Actuary contacts')).not.toBeInTheDocument()
    })

    it('renders submitted package without errors', () => {
        renderWithProviders(
            <ContactsSummarySection contract={draftSubmission} />
        )

        // We should never display missing field text on submission summary for submitted packages
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('does not include additional actuary contacts heading when this optional field is not provided', () => {
        draftSubmission.draftRates![0].draftRevision!.formData = {
            ...draftSubmission.draftRates![0].draftRevision!.formData,
            addtlActuaryContacts: [],
        }
        renderWithProviders(
            <ContactsSummarySection contract={draftSubmission} />
        )
        expect(screen.queryByText(/Additional actuary contacts/)).toBeNull()
    })
})
