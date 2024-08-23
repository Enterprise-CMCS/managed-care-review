import React from "react";
import { ContactSupportLink } from "./ContactSupportLink";

// These components are used to display remediation messages in ErrorAlert
// This is the second paragraph (which is optional) in the alert content

const DefaultRemediation = (): React.ReactNode =>  (
<>
<span>
Please refresh your browser and if you continue to
experience an error,&nbsp;
    </span>
    <ContactSupportLink />.
</>)

const SignInRemediation = (): React.ReactNode =>  (
    <>
    <span>
        Please try to sign in again and if you continue to experience an error,&nbsp;
        </span>
        <ContactSupportLink />.
    </>)

const TechnicalIssuesRemediation= (): React.ReactNode => (
    <>
    <span>
    We are working to resolve these issues as quickly as possible. If you have questions or need immediate assistance with your submission, please,&nbsp;
        </span>
        <ContactSupportLink />.
    </>)

const ValidationRemediation= (): React.ReactNode => (
    <>
    <span>
    Please provide the required information before submitting. If you continue to see this message,&nbsp;
        </span>
        <ContactSupportLink />.
    </>)

type RemediationType = 'DEFAULT' | 'TECH_ISSUE' | 'SIGNIN_ERROR' | 'VALIDATION_ERROR';

const ErrorRemediation = ({type} : {type: RemediationType | undefined}): React.ReactNode | undefined => {
   switch(type){
    case 'DEFAULT':
        return <DefaultRemediation/>
    case 'TECH_ISSUE':
            return <TechnicalIssuesRemediation/>
    case 'SIGNIN_ERROR':
        return <SignInRemediation />
    case 'VALIDATION_ERROR':
        return <ValidationRemediation />
    default:
        return undefined
   }
}

    export {type RemediationType, ErrorRemediation}