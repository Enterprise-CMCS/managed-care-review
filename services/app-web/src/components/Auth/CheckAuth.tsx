import React, { useState } from 'react'
import { isAuthenticated } from './isAuthenticated'

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function CheckAuth(): React.ReactElement {

    const [isLoading, setIsLoading] = useState(false)

    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')

    async function handleSubmit(event: React.FormEvent) {
        console.log('checking auth')
        event.preventDefault()

        setIsLoading(true)

        const isAuthed = await isAuthenticated()

        setIsLoading(false)

        if (isAuthed) {
            setAuthStatus('Authenticated')
        } else {
            setAuthStatus('Unauthenticated')
        }
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <p>Current Auth Status: {authStatus}</p>
            <button
                type="submit"
                disabled={isLoading}
            >
                Check Auth
            </button>
        </form>
    )
}
