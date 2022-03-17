import React from 'react'
import {
    Button,
    ButtonGroup,
    Modal as UswdsModal,
    ModalFooter,
    ModalHeading,
    ModalRef,
    ModalProps as UswdsModalProps,
    ModalToggleButton
} from '@trussworks/react-uswds';
import styles from './Modal.module.scss'
import { stringMap } from 'aws-sdk/clients/backup';

interface ModalComponentProps {
    id: string,
    modalHeading?: string,
    onSubmit?: () => void,
    onCancel?: () => void,
    className?: string,
    modalRef: React.RefObject<ModalRef>
}

export type ModalProps = ModalComponentProps & UswdsModalProps

export const Modal = ({
    id,
    children,
    modalHeading,
    onSubmit,
    onCancel,
    className,
    modalRef,
    ...divProps
}: ModalProps): React.ReactElement  => {


    return (
        <UswdsModal
            {...divProps}
            id={id}
            ref={modalRef}
            className={`${styles.modal} ${className}`}
        >
            {modalHeading && (
                <ModalHeading id={`${id}-heading`}>{modalHeading}</ModalHeading>
            )}
            {children}
            <ModalFooter>
                <ButtonGroup className="float-right">
                    <ModalToggleButton
                        data-testid="modal-cancel"
                        modalRef={modalRef}
                        id={`${id}=closer`}
                        closer
                        outline
                    >
                        Cancel
                    </ModalToggleButton>
                    <Button
                        type="button"
                        aria-label="Submit"
                        data-testid="modal-submit"
                        id={`${id}=submit`}
                        onClick={onSubmit}
                    >
                        Submit
                    </Button>
                </ButtonGroup>
            </ModalFooter>
        </UswdsModal>
    )
}
