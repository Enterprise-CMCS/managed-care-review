import React, { useRef, useEffect } from 'react'
import {
    Button,
    ButtonGroup,
    Modal as UswdsModal,
    ModalFooter,
    ModalHeading,
    ModalRef,
    ModalProps as UswdsModalProps
} from '@trussworks/react-uswds';
import styles from './Modal.module.scss'

interface ModalComponentProps {
    modalHeading?: string,
    modalHeadingId?: string,
    onSubmit?: () => void,
    onCancel?: () => void,
    showModal: boolean,
    className?: string,
}

export type ModalProps = ModalComponentProps & UswdsModalProps

export const Modal = ({
    children,
    modalHeading,
    modalHeadingId,
    onSubmit,
    onCancel,
    showModal,
    className,
    ...divProps
}: ModalProps): React.ReactElement  => {
    const modalRef = useRef<ModalRef>(null)

    useEffect(() => {
        modalRef.current?.toggleModal(undefined, showModal)
    },[showModal])

    return (
        <UswdsModal
            {...divProps}
            ref={modalRef}
            className={`${styles.modal} ${className}`}
        >
            {modalHeading && (
                <ModalHeading id={modalHeadingId}>
                    {modalHeading}
                </ModalHeading>
            )}
            {children}
            <ModalFooter>
                <ButtonGroup className="float-right">
                    <Button
                        type="button"
                        key="cancelButton"
                        aria-label="Cancel"
                        data-testid="modal-cancel"
                        onClick={onCancel}
                        outline
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        key="submitButton"
                        aria-label="Submit"
                        data-testid="modal-submit"
                        onClick={onSubmit}
                    >
                        Submit
                    </Button>
                </ButtonGroup>
            </ModalFooter>
        </UswdsModal>
    )
}
