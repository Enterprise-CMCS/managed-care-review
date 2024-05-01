import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ContactsSummarySection } from './ContactsSummarySectionV2'
import {
    mockContractPackageDraft,
    mockContractPackageSubmitted,
} from '../../../../../testHelpers/apolloMocks'

describe('ContactsSummarySection', () => {
    const draftSubmission = mockContractPackageDraft()
    const stateSubmission = mockContractPackageSubmitted()
    afterEach(() => jest.clearAllMocks())

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <ContactsSummarySection
                contract={draftSubmission}
                editNavigateTo="contacts"
                isStateUser
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
            <ContactsSummarySection contract={stateSubmission} isStateUser />
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
                contract={draftSubmission}
                editNavigateTo="contacts"
                isStateUser
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
    })

    it('can render only state contacts for contract only submission', () => {
        const stateSubmission = mockContractPackageSubmitted()
        stateSubmission.packageSubmissions[0].contractRevision.formData = {
            ...stateSubmission.packageSubmissions[0].contractRevision.formData,
            submissionType: 'CONTRACT_ONLY',
        }
        renderWithProviders(
            <ContactsSummarySection isStateUser contract={stateSubmission} />
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
            <ContactsSummarySection isStateUser contract={draftSubmission} />
        )

        // We should never display missing field text on submission summary for submitted packages
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('does not include additional actuary contacts heading when this optional field is not provided', () => {
        const draftSubmission = mockContractPackageDraft()
        if (
            draftSubmission.draftRates &&
            draftSubmission.draftRates[0].draftRevision
        ) {
            draftSubmission.draftRates[0].draftRevision.formData = {
                ...draftSubmission.draftRates[0].draftRevision.formData,
                addtlActuaryContacts: [],
            }
            renderWithProviders(
                <ContactsSummarySection
                    isStateUser
                    contract={draftSubmission}
                />
            )
        }
        expect(screen.queryByText(/Additional actuary contacts/)).toBeNull()
    })
})
