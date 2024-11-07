import { useEffect } from 'react'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import { useAuth } from '../contexts/AuthContext'
import { useCurrentRoute } from './useCurrentRoute'
import { useTracing } from '../contexts/TraceContext'

export const usePageTracing = (pageName?: string): void => {
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()
    const { startSpan } = useTracing()

    useEffect(() => {
        // Create a span for page view tracking
        const span = startSpan('page.view', {
            // Standard web attributes
            [SemanticAttributes.HTTP_URL]: window.location.href,
            [SemanticAttributes.HTTP_TARGET]: window.location.pathname,
            [SemanticAttributes.HTTP_ROUTE]: currentRoute.toString(),

            // Page-specific context
            'page.name': pageName || currentRoute.toString(),
            'page.route': currentRoute.toString(),
        })

        // Add user context if available
        if (loggedInUser) {
            span.setAttributes({
                [SemanticAttributes.ENDUSER_ID]: loggedInUser.email,
                [SemanticAttributes.ENDUSER_ROLE]: loggedInUser.role,
            })
        }

        // End span when component unmounts or route changes
        return () => {
            span.end()
        }
    }, [loggedInUser, currentRoute, pageName, startSpan])
}
