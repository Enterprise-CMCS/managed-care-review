import React from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { createRef} from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { AuthModeType } from '../../common-code/config'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'
import { SessionTimeoutModal } from '../../components/Modal/SessionTimeoutModal'
import { IdleTimerProvider } from 'react-idle-timer'

export const AuthenticatedRouteWrapper = ({
    children,
    authMode,
}: {
    children: React.ReactNode
    authMode: AuthModeType
}): React.ReactElement => {
    const modalRef = createRef<ModalRef>()
    const ldClient = useLDClient()
    const  {logout, refreshAuth} = useAuth()

    const openSessionTimeoutModal = () =>{
        modalRef.current?.toggleModal(undefined, true)
    }
    const closeSessionTimeoutModal = () => {
        modalRef.current?.toggleModal(undefined, false)
    }
    // Time increments for session timeout actions in milliseconds
    const SESSION_DURATION: number = ldClient?.variation(
        featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.flag,
        featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.defaultValue
    ) * 1000
    const SESSION_TIMEOUT_COUNTDOWN = 2 * 60 * 1000 // session expiration modal counts down 2 minutes
    const RECHECK_FREQUENCY = 1000

    const logoutWithSessionTimeout = async () => logout({ authMode, sessionTimeout: true })
    const logoutByUserChoice  = async () => logout({ authMode, sessionTimeout: false})
    return (
            <IdleTimerProvider
            onIdle={logoutWithSessionTimeout}
            onActive={async () => {
                await refreshAuth()
                closeSessionTimeoutModal()
            }}
            onPrompt={openSessionTimeoutModal}
            promptBeforeIdle={SESSION_TIMEOUT_COUNTDOWN}
            timeout={SESSION_DURATION}
            throttle={RECHECK_FREQUENCY}
    >
            {children}
            <SessionTimeoutModal
                modalRef={modalRef}
                refreshSession={refreshAuth}
                logoutSession={logoutByUserChoice}
            />
            </IdleTimerProvider>
    )
}
