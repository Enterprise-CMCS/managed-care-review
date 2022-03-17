import React , {createRef} from 'react'
import {ModalRef} from '@trussworks/react-uswds'
import { screen, render, waitFor } from '@testing-library/react'
import { Modal } from './Modal';

describe('Modal', () => {
    it('Renders element with modal hidden', () => {
          const modalRef = createRef<ModalRef>()
        render(
            <div>
                <Modal
                    id="hiddenModal"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                >
                    <textarea
                        id="textarea"
                        data-testid="textarea"
                    />
                </Modal>

            </div>
        )

        expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
    })

    it('Renders element with modal visible when open is true', async () => {
        const modalRef = createRef<ModalRef>()
          const handleOpen = () =>
            modalRef.current?.toggleModal(undefined, true)
        render(
            <div>
                <Modal
                    id="hiddenModal"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                >
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )
        await waitFor(() => handleOpen())

        expect(modalRef.current?.modalIsOpen).toBe(true)
        expect(screen.getByRole('dialog')).toHaveClass('is-visible')
        expect(screen.getByText('Test Modal Title')).toBeInTheDocument()
        expect(screen.getByTestId('textarea')).toBeInTheDocument()
    })

    it('Renders element with modal visible without title', async() => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () =>
            modalRef.current?.toggleModal(undefined, true)
        render(
            <div>
                <Modal id="hiddenModal" modalRef={modalRef}>
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )
        
          await waitFor(() => handleOpen())

          expect(modalRef.current?.modalIsOpen).toBe(true)
        expect(screen.getByRole('dialog')).toHaveClass('is-visible')
        expect(screen.queryByText('Test Modal Title')).toBeNull()
        expect(screen.getByTestId('textarea')).toBeInTheDocument()
    })
})
