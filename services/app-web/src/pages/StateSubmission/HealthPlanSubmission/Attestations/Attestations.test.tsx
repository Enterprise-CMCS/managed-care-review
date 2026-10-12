import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageDraft,
    updateContractDraftRevisionMockSuccess,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers/jestHelpers'
import { Attestations } from './index'

describe('Attestations', () => {
    const renderAttestations = (
        contract: ReturnType<typeof mockContractPackageDraft>,
        updateMockContract?: ReturnType<typeof mockContractPackageDraft>
    ) =>
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_ATTESTATIONS}
                    element={<Attestations />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<div>Contacts Page</div>}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                    element={<div>Rate Details Page</div>}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                    element={<div>Contract Details Page</div>}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: { ...contract, id: '15' },
                        }),
                        updateContractDraftRevisionMockSuccess({
                            contract: {
                                ...(updateMockContract ?? contract),
                                id: '15',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/attestations',
                },
            }
        )

    const mockBaseContract = () => {
        const contract = mockContractPackageDraft()
        contract.draftRevision!.formData.contractType = 'BASE'
        contract.draftRevision!.formData.procurementAttestation = false
        return contract
    }

    it('renders the attestation form', async () => {
        renderAttestations(mockBaseContract())

        expect(
            await screen.findByText('Compliance with procurement requirements')
        ).toBeInTheDocument()
        expect(screen.getByText('Required')).toBeInTheDocument()

        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).not.toBeChecked()
        expect(
            screen.getByText(/By checking this box, the state assures/)
        ).toBeInTheDocument()

        const hhsLink = screen.getByRole('link', {
            name: 'HHS Grants Policy Statement effective October 1, 2025 (opens in a new tab)',
        })
        expect(hhsLink).toHaveAttribute(
            'href',
            'https://www.hhs.gov/sites/default/files/hhs-grants-policy-statement-oct-2025.pdf'
        )
        expect(hhsLink).toHaveAttribute('target', '_blank')

        const cfrLink = screen.getByRole('link', {
            name: '2 CFR Part 200 Subpart D - Procurement Standards (opens in a new tab)',
        })
        expect(cfrLink).toHaveAttribute(
            'href',
            'https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-D/subject-group-ECFR45ddd4419ad436d/section-200.317'
        )
        expect(cfrLink).toHaveAttribute('target', '_blank')

        expect(
            screen.getByText(
                /Unsure\? Contact your state's procurement staff to confirm your state met these requirements\./
            )
        ).toBeInTheDocument()

        expect(screen.getByText('Save as draft')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Continue' })
        ).toBeInTheDocument()
    })

    it('shows an inline error and disables continue when the box is not checked', async () => {
        renderAttestations(mockBaseContract())

        const continueButton = await screen.findByRole('button', {
            name: 'Continue',
        })
        await userEvent.click(continueButton)

        expect(
            await screen.findByText(
                'You must check the box to confirm the state met the procurement requirements.'
            )
        ).toBeInTheDocument()
        expect(continueButton).toHaveAttribute('aria-disabled', 'true')
    })

    it('saves and continues to contacts when the box is checked', async () => {
        const contract = mockBaseContract()
        const updatedContract = mockBaseContract()
        updatedContract.draftRevision!.formData.procurementAttestation = true

        renderAttestations(contract, updatedContract)

        const checkbox = await screen.findByRole('checkbox')
        await userEvent.click(checkbox)

        const continueButton = screen.getByRole('button', {
            name: 'Continue',
        })
        await userEvent.click(continueButton)

        expect(await screen.findByText('Contacts Page')).toBeInTheDocument()
    })

    it('saves as draft without requiring the box to be checked', async () => {
        renderAttestations(mockBaseContract())

        const saveAsDraftButton = await screen.findByRole('button', {
            name: 'Save as draft',
        })
        await userEvent.click(saveAsDraftButton)

        expect(
            await screen.findByTestId('saveAsDraftSuccessBanner')
        ).toBeInTheDocument()
    })

    it('goes back to rate details for contract and rates submissions', async () => {
        renderAttestations(mockBaseContract())

        const backButton = await screen.findByRole('button', { name: 'Back' })
        await userEvent.click(backButton)

        expect(await screen.findByText('Rate Details Page')).toBeInTheDocument()
    })

    it('goes back to contract details for contract only submissions', async () => {
        const contract = mockBaseContract()
        contract.draftRevision!.formData.submissionType = 'CONTRACT_ONLY'

        renderAttestations(contract)

        const backButton = await screen.findByRole('button', { name: 'Back' })
        await userEvent.click(backButton)

        expect(
            await screen.findByText('Contract Details Page')
        ).toBeInTheDocument()
    })
})
