import React from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { createRef} from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { AuthModeType } from '../../common-code/config'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'
import { SessionTimeoutModal } from '../../components/Modal/SessionTimeoutModal'
import { IdleTimerProvider } from 'react-idle-timer'
import { recordJSException } from '../../otelHelpers'

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
    const logoutWithSessionTimeout = async () => logout({ authMode, sessionTimeout: true })
    const logoutByUserChoice  = async () => logout({ authMode, sessionTimeout: false})
    const refreshSession = async () => {
        await refreshAuth()
        closeSessionTimeoutModal()
    }
     // Time increments for all constants must be milliseconds
     const SESSION_TIMEOUT_COUNTDOWN = 2 * 60 * 1000
     const RECHECK_FREQUENCY = 1000
     const SESSION_DURATION: number = ldClient?.variation(
         featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.flag,
         featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.defaultValue
     ) * 60 * 1000
     let promptCountdown = SESSION_TIMEOUT_COUNTDOWN

     if (SESSION_DURATION <= SESSION_TIMEOUT_COUNTDOWN){
        // Make sure we have compatible session duration timeout versus countdown values. Duration should be longer.
        // IdleTimeoutProvider will throw an error otherwise
        promptCountdown = SESSION_DURATION - 1000
     }

    return (
            <IdleTimerProvider
            onIdle={logoutWithSessionTimeout}
            onActive={refreshSession}
            onPrompt={openSessionTimeoutModal}
            promptBeforeIdle={promptCountdown}
            timeout={SESSION_DURATION}
            throttle={RECHECK_FREQUENCY}
    >
            {children}
            <SessionTimeoutModal
                modalRef={modalRef}
                refreshSession={refreshSession}
                logoutSession={logoutByUserChoice}
            />
            </IdleTimerProvider>
    )
}
