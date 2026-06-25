import { useEffect, useRef } from 'react'
import { SpanStatusCode } from '@opentelemetry/api'
import type { Attributes, Span } from '@opentelemetry/api'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import { useTracing } from '@mc-review/otel'
import { useCurrentRoute } from './useCurrentRoute'

interface PageLoadSpanArgs {
    // True once the page's primary data has loaded and is ready to render.
    ready: boolean
    // Set if the load failed; ends the span with an error status.
    error?: Error
    // Extra attributes recorded when the span ends, e.g. the number of rows
    // returned, so load time can be correlated with result size.
    attributes?: Attributes
}

/**
 * Measures how long a page takes to load its primary data and emits it as a
 * single `page.load` span whose duration is the load time, tagged with the
 * current route so it can be charted and alerted on per page in our telemetry
 * backend (Datadog).
 *
 * The span starts when the page mounts (the load begins) and ends the first time
 * `ready` becomes true — i.e. the user-perceived time to a usable page. This is
 * distinct from usePageTracing, which spans the page's entire lifetime
 * (mount to unmount).
 */
export const usePageLoadSpan = ({
    ready,
    error,
    attributes,
}: PageLoadSpanArgs): void => {
    const { currentRoute } = useCurrentRoute()
    const { startSpan } = useTracing()

    const spanRef = useRef<Span | undefined>(undefined)
    const endedRef = useRef(false)

    // Start the span once, when the page mounts and the load begins.
    useEffect(() => {
        endedRef.current = false
        spanRef.current = startSpan('page.load', {
            [SemanticAttributes.HTTP_ROUTE]: currentRoute.toString(),
            'page.route': currentRoute.toString(),
        })

        // If the page unmounts before its data loaded, the user navigated away
        // mid-load. Close the span so it isn't leaked, flagged as abandoned so
        // these partial loads can be excluded from load-time aggregates.
        return () => {
            if (spanRef.current && !endedRef.current) {
                spanRef.current.setAttribute('page.load.abandoned', true)
                spanRef.current.end()
                endedRef.current = true
            }
        }
        // Only run on mount; currentRoute and startSpan are stable for the
        // lifetime of a given page mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // End the span the first time the page is ready (or errors).
    useEffect(() => {
        const span = spanRef.current
        if (!span || endedRef.current) {
            return
        }

        if (error) {
            span.recordException(error)
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            })
            span.end()
            endedRef.current = true
        } else if (ready) {
            if (attributes) {
                span.setAttributes(attributes)
            }
            span.setStatus({ code: SpanStatusCode.OK })
            span.end()
            endedRef.current = true
        }
    }, [ready, error, attributes])
}
