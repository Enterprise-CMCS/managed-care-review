import { useEffect } from 'react'
import { Span } from '@opentelemetry/api'

import { useAuth } from '../contexts/AuthContext'
import { useCurrentRoute } from './useCurrentRoute'
import { getTracer } from '../otelHelpers'

// Adds a new OTEL span for each route change with some custom attributes
export const useOTEL = (title?: string): void => {
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    useEffect(() => {
        const tracer = getTracer()

        const span: Span = tracer.startSpan('React: Route Change')
        span.setAttribute('current_route', currentRoute.toString())
        console.log('in main effect', currentRoute)
        if (loggedInUser) {
            span.setAttribute('user_id', loggedInUser.email)
            span.setAttribute('user_role', loggedInUser.role)
        }

        // cleanup
        return () => {
            span.end()
        }
    }, [loggedInUser, currentRoute])
}
