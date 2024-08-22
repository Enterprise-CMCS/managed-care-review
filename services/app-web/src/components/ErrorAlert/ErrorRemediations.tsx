import React from "react";
import { LetUsKnowLink } from "./LetUsKnowLink";

// These components are used to display remediation messages in ErrorAlert
// This is the second paragraph (which is optional) in the alert content

const DefaultRemediation = (): React.ReactNode =>  (
<>
<span>
Please refresh your browser and if you continue to
experience an error,&nbsp;
    </span>
    <LetUsKnowLink />
</>)

const SignInRemediation = (): React.ReactNode =>  (
    <>
    <span>
        There has been a problem signing in. Please try to sign in again and if you continue to experience an error,&nbsp;
        </span>
        <LetUsKnowLink />
    </>)

const TechnicalIssuesRemediation= (): React.ReactNode => (
    <>
    <span>
    MC-Review is currently unavailable due to technical issues. We are working to resolve these issues as quickly as possible. If you have questions or need immediate assistance with your submission, please,&nbsp;
        </span>
        <LetUsKnowLink />
    </>)

const ValidationRemediation= (): React.ReactNode => (
    <>
    <span>
    Please provide the required information before submitting. If you continue to see this message, please,&nbsp;
        </span>
        <LetUsKnowLink />
    </>)

type RemediationType = 'DEFAULT' | 'TECH_ISSUE' | 'SIGNIN_ERROR' | 'VALIDATION_ERROR';

const ErrorRemediation = ({type} : {type: RemediationType}): React.ReactNode | undefined => {
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
        return <DefaultRemediation/>
   }
}

    export {type RemediationType, ErrorRemediation}