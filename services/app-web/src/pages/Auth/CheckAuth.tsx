import React, { useState } from 'react'
import { Button, GridContainer } from '@trussworks/react-uswds'
import { useAuth } from '../App/AuthContext'

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function CheckAuth(): React.ReactElement {
    const { loggedInUser, isLoading, checkAuth } = useAuth()

    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')

    console.log('Renderinmain', loggedInUser, isLoading, checkAuth, authStatus)

    if (isLoading) {
        if (authStatus != 'Unknown') {
            setAuthStatus('Unknown')
        }
    } else {
        if (loggedInUser) {
            if (authStatus != 'Authenticated') {
                setAuthStatus('Authenticated')
            }
        } else {
            if (authStatus != 'Unauthenticated') {
                setAuthStatus('Unauthenticated')
            }
        }
    }

    async function handleSubmit(event: React.FormEvent) {
        console.log('checking auth')
        event.preventDefault()

        checkAuth()
    }

    return (
        <GridContainer>
            <form onSubmit={handleSubmit}>
                <p>Current Auth Status: {authStatus}</p>
                <Button type="submit" disabled={isLoading}>
                    Check Auth
                </Button>
            </form>
        </GridContainer>
    )
}
