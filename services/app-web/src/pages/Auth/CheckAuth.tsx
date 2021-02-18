import React, { useState } from 'react'
import { Button, Alert, GridContainer } from '@trussworks/react-uswds'
import { isAuthenticated } from './isAuthenticated'

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function CheckAuth(): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false)
    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')

    async function handleClick(event: React.MouseEvent) {
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
    const alertHeading = () => {
        switch (authStatus) {
            case 'Authenticated':
                return 'Authenticated: Logged In'
            case 'Unauthenticated':
                return 'Authentication: Not Logged In'
            default:
                return 'Authentication: Unknown'
        }
    }

    const alertType = () => {
        switch (authStatus) {
            case 'Authenticated':
                return 'success'
            case 'Unauthenticated':
                return 'warning'
            default:
                return 'info'
        }
    }

    return (
        <GridContainer>
            <Alert
                style={{ width: '600px', marginBottom: '5px' }}
                type={alertType()}
                heading={alertHeading()}
            >
                <Button
                    type="submit"
                    onClick={handleClick}
                    disabled={isLoading}
                >
                    Check Auth
                </Button>
            </Alert>
        </GridContainer>
    )
}
