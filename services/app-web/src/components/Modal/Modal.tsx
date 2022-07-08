import React, { useEffect } from 'react'
import {
    ButtonGroup,
    Modal as UswdsModal,
    ModalFooter,
    ModalHeading,
    ModalRef,
    ModalProps as UswdsModalProps,
    Button,
} from '@trussworks/react-uswds'
import { GenericApiErrorBanner } from '../Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import styles from './Modal.module.scss'

import { ActionButton } from '../ActionButton'
import { useAuth } from '../../contexts/AuthContext'

interface ModalComponentProps {
    id: string
    modalHeading?: string
    onSubmit?: React.MouseEventHandler<HTMLButtonElement>
    onCancel?: () => void
    onSubmitText?: string
    onCancelText?: string
    className?: string
    modalRef: React.RefObject<ModalRef>
    submitButtonProps?: JSX.IntrinsicElements['button']
    isSubmitting?: boolean
    modalAlert?: string
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
    submitButtonProps,
    onSubmitText,
    onCancelText,
    isSubmitting = false,
    modalAlert,
    ...divProps
}: ModalProps): React.ReactElement => {
    const { sessionIsExpiring } = useAuth()

    /* unless it's the session expiring modal, close it if the session is expiring, so the user can interact
    with the session expiring modal */
    useEffect(() => {
        if (id !== 'extend-session-modal' && sessionIsExpiring) {
            modalRef.current?.toggleModal(undefined, false)
        }
    }, [sessionIsExpiring, modalRef, id])

    const cancelHandler = (e: React.MouseEvent): void => {
        if (onCancel) {
            onCancel()
        }
        modalRef.current?.toggleModal(undefined, false)
    }

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
            {modalAlert && <GenericApiErrorBanner message={modalAlert} />}
            <div id={`${id}-modal-description`}>{children}</div>
            <ModalFooter>
                <ButtonGroup className="float-right">
                    <Button
                        type="button"
                        aria-label={`${onCancelText || 'Cancel'}`}
                        data-testid={`${id}-modal-cancel`}
                        id={`${id}-cancel`}
                        onClick={cancelHandler}
                        outline
                        disabled={isSubmitting}
                    >
                        {onCancelText || 'Cancel'}
                    </Button>
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
