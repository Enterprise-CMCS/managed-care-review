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

     // Time increments for session timeout actions must be in milliseconds
     const SESSION_TIMEOUT_COUNTDOWN = 2 * 60 * 1000
     const RECHECK_FREQUENCY = 1000
     const SESSION_DURATION: number = ldClient?.variation(
         featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.flag,
         featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.defaultValue
     ) * 60 * 1000
     let timeout = SESSION_DURATION

     if (SESSION_TIMEOUT_COUNTDOWN > SESSION_DURATION){
         recordJSException('SessionTimeoutModal error, duration must be longer than the timeout for idle prompt so we are overriding LD flag value')
         timeout = SESSION_TIMEOUT_COUNTDOWN + 2000
     }

    return (
            <IdleTimerProvider
            onIdle={logoutWithSessionTimeout}
            onActive={async () => {
                await refreshAuth()
                closeSessionTimeoutModal()
            }}
            onPrompt={openSessionTimeoutModal}
            promptBeforeIdle={SESSION_TIMEOUT_COUNTDOWN}
            timeout={timeout}
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
