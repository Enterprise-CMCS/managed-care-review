import React, { useState } from 'react'
import { Alert, GridContainer } from '@trussworks/react-uswds'

import { useFetchCurrentUserLazyQuery } from '../../gen/gqlClient'
import { ButtonWithLogging } from '../../components'

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function CheckAuth(): React.ReactElement {
    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')
    const [checkAuth, { called, loading, data }] = useFetchCurrentUserLazyQuery(
        {
            fetchPolicy: 'network-only',
        }
    )

    async function handleClick(event: React.MouseEvent) {
        event.preventDefault()
        console.info('checking auth')

        await checkAuth()
        if (data?.fetchCurrentUser) {
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
                headingLevel="h4"
                style={{ width: '600px', marginBottom: '5px' }}
                type={alertType()}
                heading={alertHeading()}
            >
                <ButtonWithLogging
                    type="submit"
                    parent_component_type="page body"
                    onClick={handleClick}
                    disabled={called && loading}
                >
                    Check Auth
                </ButtonWithLogging>
            </Alert>
        </GridContainer>
    )
}
