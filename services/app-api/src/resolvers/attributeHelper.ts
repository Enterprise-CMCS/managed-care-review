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

/* gather information about what's going on in the request, including user info and the resolver that's being called. */
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

export function setSuccessAttributesOnActiveSpan(span: Context['span']): void {
    if (!span) return
    span.setAttributes({
        'graphql.operation.success': true,
    })
    span.end()
}
