import React, { useRef, useEffect } from 'react'
import {
    Button,
    ButtonGroup,
    Modal,
    ModalFooter,
    ModalHeading,
    ModalRef,
    ModalProps as UswdsModalProps
} from '@trussworks/react-uswds';
import styles from './ReviewAndSubmitModal.module.scss'

interface ReviewAndSubmitModalProps {
    modalTitle?: string,
    onSubmit?: () => void,
    onCancel?: () => void,
    showModal: boolean,
}

export type ModalProps = ReviewAndSubmitModalProps & UswdsModalProps

export const ReviewAndSubmitModal = ({
    children,
    modalTitle,
    onSubmit,
    onCancel,
    showModal,
    ...divProps
}: ModalProps): React.ReactElement  => {
    const modalRef = useRef<ModalRef>(null)

    useEffect(() => {
        modalRef.current?.toggleModal(undefined, showModal)
    },[showModal])

    return (
        <Modal
            {...divProps}
            ref={modalRef}
            aria-labelledby="review-and-submit-modal-heading"
            aria-describedby="review-and-submit-modal-description"
            id="review-and-submit-modal"
            className={styles.reviewAndSubmitModal}
            forceAction
        >
            {modalTitle && (
                <ModalHeading id="review-and-submit-modal-heading">
                    {modalTitle}
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
        </Modal>
    )
}
