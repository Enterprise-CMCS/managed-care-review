import { createRef } from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockSubmittedHealthPlanPackageWithRevisions } from '../../testHelpers/apolloHelpers'
import { UnlockModal } from './UnlockModal'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('UnlockModal', () => {
    it('renders without errors', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <UnlockModal
                modalRef={modalRef}
                healthPlanPackage={mockSubmittedHealthPlanPackageWithRevisions()}
            />
        )
        await waitFor(() => handleOpen())
        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog).toHaveClass('is-visible'))
    })

    it('displays form validation error when submitting without a unlock reason', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <UnlockModal
                modalRef={modalRef}
                healthPlanPackage={mockSubmittedHealthPlanPackageWithRevisions()}
            />
        )
        await waitFor(() => handleOpen())
        await screen.findByTestId('unlockReason')

        const modalSubmit = screen.getByTestId('unlockReason-modal-submit')
        expect(modalSubmit).toHaveTextContent('Unlock')
        userEvent.click(modalSubmit)
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveClass('is-visible')
        expect(
            await screen.findByText(
                'You must provide a reason for unlocking this submission'
            )
        ).toBeInTheDocument()
    })

    it('draws focus to unlock reason input when form validation errors exist', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <UnlockModal
                modalRef={modalRef}
                healthPlanPackage={mockSubmittedHealthPlanPackageWithRevisions()}
            />
        )

        await waitFor(() => handleOpen())
        screen.getByText('Provide reason for unlocking')

        const textbox = await screen.findByTestId('unlockReason')

        // submit without entering anything
        userEvent.click(screen.getByTestId('unlockReason-modal-submit'))

        expect(
            await screen.findByText(
                'You must provide a reason for unlocking this submission'
            )
        ).toBeInTheDocument()

        // check focus after error
        expect(textbox).toHaveFocus()
    })
})
