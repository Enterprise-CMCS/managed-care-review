import { Context } from "../handlers/apollo_gql"
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';


/* gather information about what's going on in the request, including user info and the resolver that's being called. */
export function setContextualAttributes(name: string, user: Context["user"], span: Context["span"]): void {
    if (!span) return
    span.setAttributes({
        [SemanticAttributes.CODE_FUNCTION]: name,
        [SemanticAttributes.ENDUSER_ID]: user.email,
        [SemanticAttributes.ENDUSER_ROLE]: user.role,
    })
}

export function setErrorAttributes(message: string, span: Context["span"]): void {
    if (!span) return
    span.setAttributes({
        [SemanticAttributes.EXCEPTION_MESSAGE]: message,
    })
}

export function setSuccessAttributes(span: Context["span"]): void {
    if (!span) return
    span.setAttributes({
        'resolver.success': true,
    })
}
