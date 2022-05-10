import React from 'react'
import { Modal } from '../../components/Modal/Modal'
import { ModalRef } from '@trussworks/react-uswds'
import { createRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from '../StateSubmission/ReviewSubmit/ReviewSubmit.module.scss'

export const AuthenticatedRouteWrapper = ({
    children,
}: {
    children: React.ReactNode
}): React.ReactElement => {
    const { sessionIsExpiring } = useAuth()
    const modalRef = createRef<ModalRef>()
    useEffect(() => {
        console.log('in the effect')
        if (sessionIsExpiring) {
            modalRef.current?.toggleModal(undefined, sessionIsExpiring)
        }
    }, [sessionIsExpiring, modalRef])
    return (
        <div className={styles.wrapper}>
            {' '}
            {
                <Modal
                    modalRef={modalRef}
                    id="extend-session-modal"
                    modalHeading="Session Expiring"
                    submitButtonProps={{ className: styles.submitButton }}
                >
                    <p>Your session is going to expire in this many minutes</p>
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
