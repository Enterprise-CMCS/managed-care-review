import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ContactsSummarySection } from '.'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloMocks'

describe('ContactsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()
    afterEach(() => vi.clearAllMocks())

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <ContactsSummarySection
                submission={draftSubmission}
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

    it('can render all state contact fields', () => {
        renderWithProviders(
            <ContactsSummarySection
                submission={draftSubmission}
                editNavigateTo="contacts"
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'State contacts',
            })
        ).toBeInTheDocument()
        expect(screen.getByText(/State Contact 1/)).toBeInTheDocument()
        expect(screen.getByText(/Test State Contact 1/)).toBeInTheDocument()
        expect(screen.getByText(/State Contact 2/)).toBeInTheDocument()
        expect(screen.getByText(/Test State Contact 2/)).toBeInTheDocument()
    })

    it('can render only state contacts for contract only submission', () => {
        renderWithProviders(
            <ContactsSummarySection
                submission={{
                    ...stateSubmission,
                    submissionType: 'CONTRACT_ONLY',
                }}
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
            <ContactsSummarySection submission={draftSubmission} />
        )

        // We should never display missing field text on submission summary for submitted packages
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('does not include additional actuary contacts heading when this optional field is not provided', () => {
        const mockSubmission = mockContractAndRatesDraft({
            rateInfos: [
                {
                    rateType: 'AMENDMENT',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [],
                    supportingDocuments: [],
                    rateDateStart: new Date(),
                    rateDateEnd: new Date(),
                    rateDateCertified: new Date(),
                    rateAmendmentInfo: {
                        effectiveDateStart: new Date(),
                        effectiveDateEnd: new Date(),
                    },
                    rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                    actuaryContacts: [
                        {
                            actuarialFirm: 'DELOITTE',
                            name: 'Actuary Contact 1',
                            titleRole: 'Test Actuary Contact 1',
                            email: 'actuarycontact1@test.com',
                        },
                    ],
                    addtlActuaryContacts: [],
                    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                    packagesWithSharedRateCerts: [],
                },
            ],
        })
        renderWithProviders(
            <ContactsSummarySection submission={mockSubmission} />
        )
        expect(screen.queryByText(/Additional actuary contacts/)).toBeNull()
    })
})
