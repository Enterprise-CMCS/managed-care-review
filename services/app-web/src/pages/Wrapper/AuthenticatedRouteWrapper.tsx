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
    const logoutBySessionTimeout = async () => logout({ authMode, sessionTimeout: true })
    const logoutByUserChoice  = async () => logout({ authMode, sessionTimeout: false})
    const refreshSession = async () => {
        await refreshAuth()
        closeSessionTimeoutModal()
    }

    // For multi-tab support we emit messages related to user actions on the session timeout modal
    const onMessage = async ({action}: {action: 'LOGOUT_SESSION' | 'CONTINUE_SESSION'}) => {
      switch (action) {
        case 'LOGOUT_SESSION':
            await logoutByUserChoice()
            break;
        case 'CONTINUE_SESSION':
                await refreshSession()
                break
        default:
            // no op
        }
    }

     // IdleTimeoutProvider - time increments for all constants must be milliseconds
     const SESSION_TIMEOUT_COUNTDOWN = 2 * 60 * 1000
     const RECHECK_FREQUENCY = 500
     const SESSION_DURATION: number = ldClient?.variation(
         featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.flag,
         featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.defaultValue
     ) * 60 * 1000
     let promptCountdown = SESSION_TIMEOUT_COUNTDOWN

    // IdleTimeoutProvider – session duration must be longer than prompt countdown, override if not
     if (SESSION_DURATION <= SESSION_TIMEOUT_COUNTDOWN) {
        promptCountdown = SESSION_DURATION - 1000
     }

    return (
            <IdleTimerProvider
            onIdle={logoutBySessionTimeout}
            onActive={refreshSession}
            onPrompt={openSessionTimeoutModal}
            promptBeforeIdle={promptCountdown}
            timeout={SESSION_DURATION}
            throttle={RECHECK_FREQUENCY}
            // cross tab props
            onMessage={onMessage}
            syncTimers={RECHECK_FREQUENCY}
            crossTab={true}
    >
            {children}
            <SessionTimeoutModal
                modalRef={modalRef}
            />
            </IdleTimerProvider>
    )
}
