import React from 'react'
import { Modal } from '../../components/Modal/Modal'
import { ModalRef, Alert } from '@trussworks/react-uswds'
import { createRef, useCallback, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { extendSession } from '../Auth/cognitoAuth'
import styles from '../StateSubmission/ReviewSubmit/ReviewSubmit.module.scss'
import { dayjs } from '../../common-code/dateHelpers/dayjs'

const refreshSession = async (): Promise<void> => {
    try {
        await extendSession()
    } catch (e) {
        console.log('Error refreshing session: ', e)
    }
}

export const AuthenticatedRouteWrapper = ({
    children,
    setAlert,
}: {
    children: React.ReactNode
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    const { logout, isSessionExpiring, timeUntilLogout, updateSessionExpiry } =
        useAuth()
    const modalRef = createRef<ModalRef>()
    const LocalStorage = window.localStorage
    const logoutSession = useCallback(() => {
        updateSessionExpiry(false)
        LocalStorage.removeItem('LOGOUT_TIMER')
        if (logout) {
            logout().catch((e) => {
                console.log('Error with logout: ', e)
                setAlert &&
                    setAlert(
                        <Alert
                            data-testid="Error400"
                            style={{ width: '600px', marginBottom: '5px' }}
                            type="error"
                            heading="Oops! Something went wrong"
                        />
                    )
            })
        }
    }, [logout, setAlert, updateSessionExpiry, LocalStorage])

    const resetSessionTimeout = () => {
        updateSessionExpiry(false)
        const sessionExpirationTime = dayjs(Date.now()).add(2, 'minute')
        try {
            LocalStorage.setItem(
                'LOGOUT_TIMER',
                sessionExpirationTime.toISOString()
            )
        } catch (e) {
            console.log('Error setting logout timer: ', e)
        }
        void refreshSession()
    }

    useEffect(() => {
        console.log('in the effect')
        // if (isSessionExpiring) {
        modalRef.current?.toggleModal(undefined, isSessionExpiring)
        // }
    }, [isSessionExpiring, modalRef])

    useEffect(() => {
        if (timeUntilLogout < 1) {
            logoutSession()
        }
    }, [timeUntilLogout, logoutSession])
    return (
        <div className={styles.wrapper}>
            {' '}
            {
                <Modal
                    modalRef={modalRef}
                    id="extend-session-modal"
                    modalHeading="Session Expiring"
                    onSubmitText="Continue Session"
                    onCancelText="Logout"
                    onCancel={logoutSession}
                    submitButtonProps={{ className: styles.submitButton }}
                    onSubmit={resetSessionTimeout}
                >
                    <p>
                        Your session is going to expire in {timeUntilLogout}{' '}
                        seconds
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
            }
            {children}
        </div>
    )
}
