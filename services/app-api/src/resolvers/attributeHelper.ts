import type { Context } from '../handlers/apollo_gql'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import { SpanStatusCode } from '@opentelemetry/api'

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
        [SemanticAttributes.ENDUSER_ID]: user.email,
        [SemanticAttributes.ENDUSER_ROLE]: user.role,
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
