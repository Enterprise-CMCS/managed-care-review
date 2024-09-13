import { useEffect } from 'react'
import { Span } from '@opentelemetry/api'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import { useAuth } from '../contexts/AuthContext'
import { useCurrentRoute } from './useCurrentRoute'
import { getTracer } from '@mc-review/otel'

// Adds a new OTEL span for each route change with some custom attributes. Proxy to users time on a given page.
export const useOTEL = (title?: string): void => {
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    useEffect(() => {
        const tracer = getTracer()
        const httpURL = window.location.href
        const span: Span = tracer.startSpan('React: Page View')

        span.setAttributes({
            [SemanticAttributes.HTTP_URL]: httpURL,
            current_route_name: currentRoute.toString(), // e.g. SUBMISSION_TYPE
        })

        if (loggedInUser) {
            span.setAttributes({
                [SemanticAttributes.ENDUSER_ID]: loggedInUser.email,
                [SemanticAttributes.ENDUSER_ROLE]: loggedInUser.role,
            })

            // cleanup
            return () => {
                span.end()
            }
        }
    }, [loggedInUser, currentRoute])
}
