import React from 'react'
import { ContactSupportLink } from './ContactSupportLink'

// These components are used to display remediation messages in ErrorAlert
// This is the second paragraph (which is optional) in the alert content

const DefaultRemediation = (): React.ReactElement => (
    <>
        <span>
            Please refresh your browser and if you continue to experience an
            error,&nbsp;
        </span>
        <ContactSupportLink />.
    </>
)

const SignInRemediation = (): React.ReactElement => (
    <>
        <span>
            Please try to sign in again and if you continue to experience an
            error,&nbsp;
        </span>
        <ContactSupportLink />.
    </>
)

const TechnicalIssuesRemediation = (): React.ReactElement => (
    <>
        <span>
            If you have questions or need immediate assistance with your
            submission, please,&nbsp;
        </span>
        <ContactSupportLink />.
    </>
)

const ValidationRemediation = (): React.ReactElement => (
    <>
        <span>
            Please provide the required information before submitting. If you
            continue to see this message,&nbsp;
        </span>
        <ContactSupportLink />.
    </>
)

type RemediationType =
    | 'DEFAULT'
    | 'TECH_ISSUE'
    | 'SIGNIN_ERROR'
    | 'VALIDATION_ERROR'

const ErrorRemediation = ({
    type,
}: {
    type: RemediationType | undefined
}): React.ReactElement | null => {
    switch (type) {
        case 'DEFAULT':
            return <DefaultRemediation />
        case 'TECH_ISSUE':
            return <TechnicalIssuesRemediation />
        case 'SIGNIN_ERROR':
            return <SignInRemediation />
        case 'VALIDATION_ERROR':
            return <ValidationRemediation />
        default:
            return null
    }
}

export { type RemediationType, ErrorRemediation }
