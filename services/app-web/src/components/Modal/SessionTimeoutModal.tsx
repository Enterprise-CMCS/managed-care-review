import React from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { Modal } from './Modal'
import styles from './Modal.module.scss'
import { useIdleTimerContext } from 'react-idle-timer'
import dayjs from 'dayjs'

type SessionTimeoutModalProps = {
    modalRef: React.RefObject<ModalRef>
    logoutSession: () => Promise<void>,
    refreshSession: () => Promise<void>
}
export const SessionTimeoutModal = ({
  modalRef,
  logoutSession,
  refreshSession

}: SessionTimeoutModalProps): React.ReactElement | null => {

    // TODO check if modal disappears when logged out
    // TODO check if modal overrides another modal that is visible (e.g. unlock/resubmit modal)
    // TODO retest cancel, continue, and do nothing
    const idleTimer = useIdleTimerContext()
    const countdownRemaining = idleTimer.getRemainingTime()* 1000

    return (
        <Modal
        modalRef={modalRef}
        id="extend-session-modal"
        modalHeading="Session Expiring"
        onSubmitText="Continue Session"
        onCancelText="Logout"
        onCancel={logoutSession}
        submitButtonProps={{ className: styles.submitSuccessButton }}
        onSubmit={refreshSession}
        forceAction={true}
    >
        <p
            aria-live={'assertive'}
            aria-atomic={true}
        >
            Your session is going to expire in{' '}
            {dayjs
                .duration(countdownRemaining, 'seconds')
                .format('mm:ss')}{' '}
        </p>
        <p>
            If you would like to extend your session, click the
            Continue Session button
        </p>
        <p>
            If you would like to end your session now, click the
            Logout button
        </p>
    </Modal>
    )
}
