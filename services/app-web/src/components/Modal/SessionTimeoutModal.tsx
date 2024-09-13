import React, {useEffect, useState} from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { Modal } from './Modal'
import styles from './Modal.module.scss'
import { useIdleTimerContext } from 'react-idle-timer'
import dayjs from 'dayjs'
import { SESSION_ACTIONS } from '../../pages/Wrapper/AuthenticatedRouteWrapper'

type SessionTimeoutModalProps = {
    modalRef: React.RefObject<ModalRef>
}

export const SessionTimeoutModal = ({
  modalRef,
}: SessionTimeoutModalProps): React.ReactElement | null => {
    const idleTimer = useIdleTimerContext()
    const [countdownSeconds, setCountdownSeconds]= useState(idleTimer.getRemainingTime() / 1000)

    const handleLogoutSession = async () => {
        idleTimer.message({action: SESSION_ACTIONS.LOGOUT_SESSION}, true)
    }
    const handleContinueSession = async () => {
        idleTimer.activate()
        idleTimer.message({action:SESSION_ACTIONS.CONTINUE_SESSION}, true)
    }
    useEffect(() => {
        const interval = setInterval(() => {
          setCountdownSeconds(Math.ceil(idleTimer.getRemainingTime() / 1000))
        }, 500)

        return () => {
          clearInterval(interval)
        }
      })


    return (
        <Modal
        modalRef={modalRef}
        id="extend-session-modal"
        modalHeading="Session Expiring"
        onSubmitText="Continue Session"
        onCancelText="Logout"
        onCancel={handleLogoutSession}
        submitButtonProps={{ className: styles.submitSuccessButton }}
        onSubmit={handleContinueSession}
        forceAction={true}
    >
        <p
            aria-live={'assertive'}
            aria-atomic={true}
        >
            Your session is going to expire in&nbsp;
            <span data-testid="remaining">{dayjs
                .duration(countdownSeconds, 'seconds')
                .format('mm:ss')}</span>
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
