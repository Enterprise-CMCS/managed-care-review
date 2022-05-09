import React from 'react'
import {
    ButtonGroup,
    Modal as UswdsModal,
    ModalFooter,
    ModalHeading,
    ModalRef,
    ModalProps as UswdsModalProps,
    ModalToggleButton,
} from '@trussworks/react-uswds'
import styles from './Modal.module.scss'

import { ActionButton } from '../ActionButton'

interface ModalComponentProps {
    id: string
    modalHeading?: string
    onSubmit?: React.MouseEventHandler<HTMLButtonElement>
    onSubmitText?: string
    className?: string
    modalRef: React.RefObject<ModalRef>
    submitButtonProps?: JSX.IntrinsicElements['button']
    isSubmitting?: boolean
}

export type ModalProps = ModalComponentProps & UswdsModalProps

export const Modal = ({
    id,
    children,
    modalHeading,
    onSubmit,
    className,
    modalRef,
    submitButtonProps,
    onSubmitText,
    isSubmitting = false,
    ...divProps
}: ModalProps): React.ReactElement => {
    return (
        <UswdsModal
            aria-labelledby={`${id}-heading`}
            aria-describedby={`${id}-description`}
            {...divProps}
            id={id}
            ref={modalRef}
            className={`${styles.modal} ${className}`}
        >
            {modalHeading && (
                <ModalHeading id={`${id}-heading`}>{modalHeading}</ModalHeading>
            )}
            <div id={`${id}-modal-description`}>{children}</div>
            <ModalFooter>
                <ButtonGroup className="float-right">
                    <ModalToggleButton
                        data-testid={`${id}-modal-cancel`}
                        modalRef={modalRef}
                        id={`${id}-closer`}
                        closer
                        outline
                        disabled={isSubmitting}
                    >
                        Cancel
                    </ModalToggleButton>
                    <ActionButton
                        type="submit"
                        data-testid={`${id}-modal-submit`}
                        variant="success"
                        id={`${id}-submit`}
                        onClick={onSubmit}
                        loading={isSubmitting}
                        {...submitButtonProps}
                    >
                        {onSubmitText || 'Submit'}
                    </ActionButton>
                </ButtonGroup>
            </ModalFooter>
        </UswdsModal>
    )
}
