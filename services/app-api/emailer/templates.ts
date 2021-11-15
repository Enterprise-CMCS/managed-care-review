import { StateSubmissionType } from "../../app-web/src/common-code/domain-models"
import {EmailData} from './'

const stageName =  process.env.stage
const emailSource =  process.env.emailSource || 'UNKNOWN_SOURCE';

// This should match code in stateSubmissionResolver
const generateSubmissionName = (sub:StateSubmissionType): string =>  {
    const padNumber = sub.stateNumber.toString().padStart(4, '0')
    return `${sub.stateCode.toUpperCase()}-${sub.programID.toUpperCase()}-${padNumber}`
}

const submissionReceivedCMSEmail= (submission: StateSubmissionType): EmailData => { 
    return {
        toAddresses: ['hana@truss.works'],
        sourceEmail: emailSource,
        subjectData: `${stageName !== 'PROD' ? stageName + '- ' : ''} New Managed Care Submission: ${generateSubmissionName(submission)}`,
        bodyData:
    `
        ${generateSubmissionName(submission)} was received from ${submission.stateCode}.

        Submission type: ${submission.submissionType}
        Submission description: ${submission.submissionType}

        View the full submission
    `}
}


const submissionReceivedStateEmail= (submission: StateSubmissionType) : EmailData => {
    return {
    toAddresses: ['hana@truss.works'],
    sourceEmail: emailSource,
    subjectData: `${stageName !== 'PROD' ? `[${stageName}] `: ''}${generateSubmissionName(submission)} was sent to CMS`,
    bodyData:
`
    ${generateSubmissionName(submission)} was received from ${submission.stateCode}.

    Submission type: ${submission.submissionType}
    Submission description: ${submission.submissionType}

    View the full submission
`}}



export {submissionReceivedStateEmail, submissionReceivedCMSEmail}
