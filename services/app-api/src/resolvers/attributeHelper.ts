import type { Context } from '../handlers/apollo_gql'
import {
    SpanStatusCode,
    trace,
    context as otelContext,
    type Span,
    type Attributes,
} from '@opentelemetry/api'
import {
    SEMATTRS_ENDUSER_ID,
    SEMATTRS_ENDUSER_ROLE,
} from '@opentelemetry/semantic-conventions'
import { parseErrorToError } from '@mc-review/helpers'

/**
 * Creates a resolver span as a child of the GraphQL request span.
 * This ensures proper trace hierarchy: frontend → GraphQL request → resolver → Prisma → DB
 *
 * @param context - GraphQL resolver context containing tracer, ctx, and requestSpan
 * @param resolverName - Name of the resolver (e.g., 'fetchContract', 'submitHealthPlanPackage')
 * @param attributes - Optional additional attributes to add to the span
 * @returns A new span for this resolver, or undefined if tracing is disabled
 *
 * @example
 * ```typescript
 * const span = createResolverSpan(context, 'fetchContract', {
 *   'contract.id': input.contractID,
 * })
 * setResolverDetailsOnActiveSpan('fetchContract', context.user, span)
 * ```
 */
export function createResolverSpan(
    context: Context,
    resolverName: string,
    attributes?: Attributes
): Span | undefined {
    const { ctx, tracer, span: requestSpan } = context

    if (!tracer) {
        return undefined
    }

    // Create a resolver context that has the request span as its parent
    // This creates proper hierarchy: request → resolver → database
    const resolverContext = requestSpan
        ? trace.setSpan(ctx || otelContext.active(), requestSpan)
        : ctx || otelContext.active()

    return tracer.startSpan(
        `resolver.${resolverName}`,
        {
            attributes: {
                'graphql.resolver': resolverName,
                'graphql.field.name': resolverName,
                ...attributes,
            },
        },
        resolverContext
    )
}

/**
 * Executes a resolver function with proper OTEL context propagation and automatic span lifecycle management.
 * This ensures that Prisma spans are created as children of the resolver span.
 * Automatically handles span status (OK/ERROR) and span ending.
 *
 * @param context - GraphQL resolver context
 * @param resolverName - Name of the resolver
 * @param attributes - Optional span attributes
 * @param resolver - The resolver function to execute
 * @returns The result of the resolver function
 *
 * @example
 * ```typescript
 * return withResolverSpan(context, 'fetchContract', { 'contract.id': input.contractID }, async (span) => {
 *   setResolverDetails(span, context.user)
 *   const contract = await store.findContractWithHistory(input.contractID)
 *   return { contract }
 * })
 * ```
 */
export async function withResolverSpan<T>(
    context: Context,
    resolverName: string,
    attributes: Attributes | undefined,
    resolver: (span: Span | undefined) => Promise<T>
): Promise<T> {
    const span = createResolverSpan(context, resolverName, attributes)

    if (!span) {
        // No tracing enabled, just execute the resolver
        return resolver(span)
    }

    // Execute the resolver within the span's context so Prisma spans become children
    const resolverContext = trace.setSpan(otelContext.active(), span)

    try {
        const result = await otelContext.with(resolverContext, () =>
            resolver(span)
        )
        // Leave the span status Unset (the default) on a non-throwing return.
        // Backends treat Unset as non-error, and—unlike OK, which the OTEL spec
        // makes final—it lets a non-fatal ERROR set inside the resolver (e.g. via
        // recordResolverError) survive instead of being clobbered back to healthy.
        span.end()
        return result
    } catch (error) {
        // Error: record exception, set error status, end span, then rethrow
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: parseErrorToError(error).message,
        })
        if (error instanceof Error) {
            span.recordException(error)
        }
        span.end()
        throw error
    }
}

/**
 * Sets user context attributes on the resolver span.
 * Should be called at the beginning of the resolver to capture user info.
 *
 * @param span - The resolver span (can be undefined if tracing is disabled)
 * @param user - The user from the GraphQL context
 *
 * @example
 * ```typescript
 * return withResolverSpan(context, 'fetchContract', attributes, async (span) => {
 *   setResolverDetails(span, context.user)
 *   // ... resolver logic
 * })
 * ```
 */
export function setResolverDetails(
    span: Span | undefined,
    user: Context['user']
): void {
    if (!span) return
    span.setAttributes({
        [SEMATTRS_ENDUSER_ID]: user.email,
        [SEMATTRS_ENDUSER_ROLE]: user.role,
    })
}

/**
 * Records a non-fatal error on the span: attaches the exception event AND marks
 * the span status ERROR so it surfaces in status-based dashboards/alerts.
 *
 * Use this for errors that don't terminate the resolver (the resolver still
 * returns a fallback value). A recorded exception should always be actionable in
 * the trace—an exception event without an ERROR status looks healthy and hides
 * the failure. For fatal errors, just throw; withResolverSpan handles those.
 *
 * @param span - The resolver span
 * @param error - The error to record (Error object or string message)
 */
export function recordResolverError(
    span: Span | undefined,
    error: Error | string
): void {
    if (!span) return
    const err = error instanceof Error ? error : new Error(error)
    span.recordException(err)
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
}

// ===== DEPRECATED FUNCTIONS =====
// The following functions are deprecated and maintained for backwards compatibility.
// When using withResolverSpan, you don't need to call setSuccessAttributesOnActiveSpan
// or setErrorAttributesOnActiveSpan - the helper manages span lifecycle automatically.

/**
 * @deprecated Use setResolverDetails(span, user) instead. This function has a misleading name.
 */
export function setResolverDetailsOnActiveSpan(
    name: string,
    user: Context['user'],
    span: Context['span']
): void {
    if (!span) {
        console.info(`No span set on ${name} call`)
        return
    }
    span.setAttributes({
        [SEMATTRS_ENDUSER_ID]: user.email,
        [SEMATTRS_ENDUSER_ROLE]: user.role,
        'graphql.operation.name': name,
    })
}

/**
 * @deprecated When using withResolverSpan, just throw the error - it will be recorded automatically.
 * For non-fatal errors, use recordResolverError(span, error) instead.
 */
export function setErrorAttributesOnActiveSpan(
    message: string,
    span: Context['span']
): void {
    if (!span) return
    span.recordException(new Error(message))
    span.setStatus({
        message: message,
        code: SpanStatusCode.ERROR,
    })
    span.end()
}

/**
 * @deprecated When using withResolverSpan, you don't need to call this - the helper ends the span automatically.
 */
export function setSuccessAttributesOnActiveSpan(span: Context['span']): void {
    if (!span) return
    span.setAttributes({
        'graphql.operation.success': true,
    })
    span.end()
}
