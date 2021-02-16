import React, { useState } from 'react'
import { Button, GridContainer } from '@trussworks/react-uswds'
import { useAuth } from '../App/AuthContext'

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function CheckAuth(): React.ReactElement {
    const { isLoading, checkAuth } = useAuth()

    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')

    async function handleSubmit(event: React.FormEvent) {
        console.log('checking auth')
        event.preventDefault()

        const isAuthed = await checkAuth()

        if (isAuthed) {
            setAuthStatus('Authenticated')
        } else {
            setAuthStatus('Unauthenticated')
        }
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
