import React, { createRef } from 'react'
import { ModalRef, ModalToggleButton } from '@trussworks/react-uswds'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'
import {
    userClickByTestId,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'

describe('Modal', () => {
    it('Renders element by default with modal hidden', () => {
        const modalRef = createRef<ModalRef>()
        renderWithProviders(
            <div>
                <Modal id="hiddenModal" modalRef={modalRef}>
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )

        expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
    })

    it('Renders open modal with appropriate subcomponents', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)

        renderWithProviders(
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

        handleOpen()
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(
                screen.getByRole('heading', { name: 'Test Modal Title' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Cancel' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Submit' })
            ).toBeInTheDocument()
        })
    })

    it('Renders open modal with passed in cancel button text', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)

        renderWithProviders(
            <div>
                <Modal
                    id="hiddenModal"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                    onCancelText="Cancel Button Test"
                >
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )

        handleOpen()
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(
                screen.getByRole('button', { name: 'Cancel Button Test' })
            ).toBeInTheDocument()
        })
    })

    it('Calls onSubmit prop when Submit button is clicked', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        const onSubmit = jest.fn()
        renderWithProviders(
            <div>
                <Modal
                    id="test"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                    onSubmit={onSubmit}
                >
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )
        handleOpen()
        await userClickByTestId(screen, 'test-modal-submit')
        expect(onSubmit).toHaveBeenCalled()
    })

    it('Calls onCancel prop when Cancel button is clicked', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        const onCancel = jest.fn()
        renderWithProviders(
            <div>
                <Modal
                    id="test"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                    onCancel={onCancel}
                >
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )
        handleOpen()
        await userClickByTestId(screen, 'test-modal-cancel')
        expect(onCancel).toHaveBeenCalled()
    })

    it('renders onSubmitText prop string on Submit button when one is passed', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        const onSubmit = jest.fn()
        renderWithProviders(
            <div>
                <Modal
                    id="test"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                    onSubmit={onSubmit}
                    onSubmitText={'Resubmit'}
                >
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )
        handleOpen()
        const onSubmitButton = await screen.findByTestId('test-modal-submit')
        expect(onSubmitButton).toHaveTextContent('Resubmit')
    })

    it('renders default submit button text when onSubmitText is undefined', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        const onSubmit = jest.fn()
        renderWithProviders(
            <div>
                <Modal
                    id="test"
                    modalHeading="Test Modal Title"
                    modalRef={modalRef}
                    onSubmit={onSubmit}
                >
                    <textarea id="textarea" data-testid="textarea" />
                </Modal>
            </div>
        )
        handleOpen()
        const onSubmitButton = await screen.findByTestId('test-modal-submit')
        expect(onSubmitButton).toHaveTextContent('Submit')
    })

    describe('opening and closing the modal', () => {
        it('Opens modal via ref.current.toggleModal', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
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
            handleOpen()
            await waitFor(() => {
                expect(modalRef.current?.modalIsOpen).toBe(true)
                expect(screen.getByRole('dialog')).toHaveClass('is-visible')
                expect(screen.getByText('Test Modal Title')).toBeInTheDocument()
                expect(screen.getByTestId('textarea')).toBeInTheDocument()
            })
        })

        it('Opens modal via opener button click', async () => {
            const modalRef = createRef<ModalRef>()
            renderWithProviders(
                <div>
                    <Modal
                        id="hiddenModal"
                        modalHeading="Test Modal Title"
                        modalRef={modalRef}
                    >
                        <textarea data-testid="modal-children" />
                    </Modal>
                    <ModalToggleButton
                        modalRef={modalRef}
                        data-testid="opener-button"
                        opener
                    >
                        Open modal
                    </ModalToggleButton>
                </div>
            )
            await userClickByTestId(screen, 'opener-button')

            expect(modalRef.current?.modalIsOpen).toBe(true)
            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
        })

        it('Closes modal via Cancel button click', async () => {
            const modalRef = createRef<ModalRef>()
            renderWithProviders(
                <div>
                    <Modal
                        id="test"
                        modalHeading="Test Modal Title"
                        modalRef={modalRef}
                    >
                        <textarea data-testid="modal-children" />
                    </Modal>
                    <ModalToggleButton
                        modalRef={modalRef}
                        data-testid="opener-button"
                        opener
                    >
                        Open modal
                    </ModalToggleButton>
                </div>
            )

            await userClickByTestId(screen, 'opener-button')

            expect(modalRef.current?.modalIsOpen).toBe(true)

            await userClickByTestId(screen, 'test-modal-cancel')
            expect(modalRef.current?.modalIsOpen).toBe(false)
            expect(screen.getByRole('dialog')).not.toHaveClass('is-visible')
        })

        it('Closes modal via ESC key', async () => {
            const modalRef = createRef<ModalRef>()
            renderWithProviders(
                <div>
                    <Modal
                        id="test"
                        modalHeading="Test Modal Title"
                        modalRef={modalRef}
                    >
                        <textarea data-testid="modal-children" />
                    </Modal>
                    <ModalToggleButton
                        modalRef={modalRef}
                        data-testid="opener-button"
                        opener
                    >
                        Open modal
                    </ModalToggleButton>
                </div>
            )
            await userClickByTestId(screen, 'opener-button')

            expect(modalRef.current?.modalIsOpen).toBe(true)

            await fireEvent.keyDown(screen.getByText(/Test Modal Title/i), {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                charCode: 27,
            })

            expect(modalRef.current?.modalIsOpen).toBe(false)
            expect(screen.getByRole('dialog')).not.toHaveClass('is-visible')
        })

        it('Closes modal via ref.current.toggleModal', async () => {
            const modalRef = createRef<ModalRef>()
            const handleClose = () =>
                modalRef.current?.toggleModal(undefined, false)
            renderWithProviders(
                <div>
                    <Modal
                        id="hiddenModal"
                        modalHeading="Test Modal Title"
                        modalRef={modalRef}
                    >
                        <textarea data-testid="modal-children" />
                    </Modal>
                    <ModalToggleButton
                        modalRef={modalRef}
                        data-testid="opener-button"
                        opener
                    >
                        Open modal
                    </ModalToggleButton>
                </div>
            )

            await userClickByTestId(screen, 'opener-button')
            expect(modalRef.current?.modalIsOpen).toBe(true)
            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(screen.queryByTestId('modal-children')).toBeInTheDocument()

            await waitFor(() => handleClose())

            await waitFor(() => {
                expect(modalRef.current?.modalIsOpen).toBe(false)
                expect(screen.getByRole('dialog')).not.toHaveClass('is-visible')
            })
        })

        it('renders modalAlert prop string and header text on Alert component when one is passed', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            const onSubmit = jest.fn()
            renderWithProviders(
                <div>
                    <Modal
                        id="test"
                        modalHeading="Test Modal Title"
                        modalRef={modalRef}
                        onSubmit={onSubmit}
                        onSubmitText={'Resubmit'}
                        modalAlert={{ message: 'This should be a modal alert' }}
                    >
                        <textarea id="textarea" data-testid="textarea" />
                    </Modal>
                </div>
            )
            handleOpen()
            expect(
                await screen.findByText('This should be a modal alert')
            ).toBeInTheDocument()
            expect(await screen.findByText('System error')).toBeInTheDocument()
        })
    })
})
