import { ModalRef, ModalToggleButton } from '@trussworks/react-uswds'
import styles from '../SubmissionSummarySection.module.scss'

export const UnlockRateButton = ({
    disabled,
    modalRef,
}: {
    disabled: boolean
    modalRef: React.RefObject<ModalRef>
}): React.ReactElement => {
    return (
        <ModalToggleButton
            modalRef={modalRef}
            className={styles.submitButton}
            disabled={disabled}
            outline
            opener
        >
            Unlock rate
        </ModalToggleButton>
    )
}
