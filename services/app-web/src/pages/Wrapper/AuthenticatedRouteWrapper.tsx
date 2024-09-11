import React from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { createRef} from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'
import { SessionTimeoutModal } from '../../components/Modal/SessionTimeoutModal'
import { IdleTimerProvider } from 'react-idle-timer'
import { usePage } from '../../contexts/PageContext'

// AuthenticatedRouteWrapper control access to protected routes and the session timeout modal
// For more on expected behavior for session timeout see feature-brief-session-expiration.md
export const AuthenticatedRouteWrapper = ({
    children,
}: {
    children: React.ReactNode
}): React.ReactElement => {
    const modalRef = createRef<ModalRef>()
    const ldClient = useLDClient()
    const  {logout, refreshAuth} = useAuth()
    const {activeModalRef, updateModalRef} = usePage()

    const openSessionTimeoutModal = () =>{
        // Make sure we close any active modals for session timeout, which overrides the focus trap
        console.log( 'session timeout modal open' , activeModalRef, modalRef)
            if(activeModalRef && activeModalRef !== modalRef) {
            activeModalRef.current?.toggleModal(undefined, false)
            updateModalRef({updatedModalRef: modalRef})
        }

        modalRef.current?.toggleModal(undefined, true)
    }
    const closeSessionTimeoutModal = () => {
        modalRef.current?.toggleModal(undefined, false)
    }
    const logoutBySessionTimeout = async () => logout({  sessionTimeout: true })
    const logoutByUserChoice  = async () => logout({  sessionTimeout: false})
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

     // All time increment constants must be milliseconds
     const RECHECK_FREQUENCY = 500
     const SESSION_TIMEOUT_COUNTDOWN = 2 * 60 * 1000
     const SESSION_DURATION: number = ldClient?.variation(
        featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.flag,
        featureFlags.MINUTES_UNTIL_SESSION_EXPIRES.defaultValue
    ) * 60 * 1000 //  controlled by feature flag for testing in lower environments
    const SHOW_SESSION_EXPIRATION:boolean = ldClient?.variation(
        featureFlags.SESSION_EXPIRING_MODAL.flag,
        featureFlags.SESSION_EXPIRING_MODAL.defaultValue
    )//  controlled by feature flag for testing in lower environments
    let promptCountdown = SESSION_TIMEOUT_COUNTDOWN //  may be reassigned if session duration is shorter time period

    // Session duration must be longer than prompt countdown to allow IdleTimer to load
     if (SESSION_DURATION <= SESSION_TIMEOUT_COUNTDOWN) {
        promptCountdown = SESSION_DURATION - 1000
     }

    return (<IdleTimerProvider
            onIdle={logoutBySessionTimeout}
            onActive={refreshSession}
            onPrompt={ SHOW_SESSION_EXPIRATION ? openSessionTimeoutModal: undefined}
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
            </IdleTimerProvider>)
}
