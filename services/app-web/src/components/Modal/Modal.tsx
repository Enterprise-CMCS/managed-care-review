import React from 'react'
import {
    ButtonGroup,
    Modal as UswdsModal,
    ModalFooter,
    ModalHeading,
    ModalRef,
    ModalProps as UswdsModalProps,
} from '@trussworks/react-uswds'
import {
    GenericApiErrorBanner,
    GenericApiErrorProps,
} from '../Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import styles from './Modal.module.scss'

import { ActionButton } from '../ActionButton'
import { ButtonWithLogging } from '../TealiumLogging'
import { usePage } from '../../contexts/PageContext'

interface ModalComponentProps {
    id: string
    modalHeading?: string
    onSubmit?: () => void
    onCancel?: () => void
    onSubmitText?: string
    onCancelText?: string
    className?: string
    modalRef: React.RefObject<ModalRef>
    submitButtonProps?: JSX.IntrinsicElements['button']
    isSubmitting?: boolean
    modalAlert?: GenericApiErrorProps
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
    const { updateModalRef } = usePage()
    const cancelHandler = (_e: React.MouseEvent): void => {
        if (onCancel) {
            onCancel()
        }
        updateModalRef({ updatedModalRef: undefined })
        modalRef.current?.toggleModal(undefined, false)
    }

    const submitHandler = (_e: React.MouseEvent): void => {
        if (onSubmit) {
            onSubmit()
        }
        updateModalRef({ updatedModalRef: undefined })
        // do not close modal here manually
        // sometimes validation fails and we want to keep modal open but display errors
        // consumer should determine wether or not to close modal in onSubmit
    }

    return (
        <UswdsModal
            aria-labelledby={`${id}-heading`}
            aria-describedby={`${id}-description`}
            {...divProps}
            id={id}
            ref={modalRef}
            className={`${styles.modal} ${className}`}
            placeholder={null}
            onPointerEnterCapture={null}
            onPointerLeaveCapture={null}
        >
            {modalHeading && (
                <ModalHeading id={`${id}-heading`}>{modalHeading}</ModalHeading>
            )}
            {modalAlert && (
                <GenericApiErrorBanner
                    heading={modalAlert.heading}
                    message={modalAlert.message}
                    validationFail={modalAlert.validationFail}
                />
            )}
            <div id={`${id}-modal-description`}>{children}</div>
            <ModalFooter>
                <ButtonGroup className="float-right">
                    <ButtonWithLogging
                        type="button"
                        aria-label={`${onCancelText || 'Cancel'}`}
                        data-testid={`${id}-modal-cancel`}
                        parent_component_type="modal"
                        id={`${id}-cancel`}
                        onClick={cancelHandler}
                        outline
                        disabled={isSubmitting}
                    >
                        {onCancelText || 'Cancel'}
                    </ButtonWithLogging>
                    <ActionButton
                        type="submit"
                        data-testid={`${id}-modal-submit`}
                        variant="success"
                        id={`${id}-submit`}
                        parent_component_type="modal"
                        onClick={submitHandler}
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
