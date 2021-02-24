import React, { useState } from 'react'
import { Button, Alert, GridContainer } from '@trussworks/react-uswds'
import { useLazyQuery } from '@apollo/client'

import { HELLO_WORLD } from '../../api'

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function CheckAuth(): React.ReactElement {
    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')

    const [checkAuth, { called, loading, data }] = useLazyQuery(HELLO_WORLD, {
        fetchPolicy: 'network-only',
        variables: { language: 'english' },
    })

    async function handleClick(event: React.MouseEvent) {
        event.preventDefault()
        console.log('checking auth')

        checkAuth()
        if (data?.hello) {
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
                    disabled={called && loading}
                >
                    Check Auth
                </Button>
            </Alert>
        </GridContainer>
    )
}
