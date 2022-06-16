import { useEffect } from 'react'
import { Span } from '@opentelemetry/api'

import { useAuth } from '../contexts/AuthContext'
import { useCurrentRoute } from './useCurrentRoute'
import { getTracer } from '../otelHelpers'

// Adds a new OTEL span for each route change with some custom attributes. Proxy to users time on a given page.
export const useOTEL = (title?: string): void => {
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    useEffect(() => {
        const tracer = getTracer()

        const span: Span = tracer.startSpan('React: Page View')
        span.setAttribute('current_route', currentRoute.toString())

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
