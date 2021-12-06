import { URL } from 'url'

import {
    SubmissionType,
    StateSubmissionType,
    submissionName,
} from '../../app-web/src/common-code/domain-models'
import { EmailData, EmailConfiguration } from './'

enum EmailTemplate {
    CMS_NEW_PACKAGE,
    STATE_NEW_PACKAGE,
}

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const newEmailTemplate = ({
    template,
    submission,
    config,
}: {
    template: EmailTemplate
    submission: StateSubmissionType
    config: EmailConfiguration
}): EmailData | Error => {
    switch (template) {
        case EmailTemplate['CMS_NEW_PACKAGE']:
            return newSubmissionCMSEmailTemplate(submission, config)
        case EmailTemplate['STATE_NEW_PACKAGE']:
            return newSubmissionStateEmailTemplate(submission, config)
        default:
            return new Error('Invalid Email Template Type')
    }
}

const newSubmissionCMSEmailTemplate = (
    submission: StateSubmissionType,
    config: EmailConfiguration
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    return {
        toAddresses: ['mc-review-qa@truss.works'],
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${submissionName(submission)}`,
        bodyText: `
            ${submissionName(submission)} was received from ${
            submission.stateCode
        }.

            Submission type: ${SubmissionTypeRecord[submission.submissionType]}
            Submission description: ${submission.submissionDescription}

            View the full submission: ${submissionURL}`,
        bodyHTML: `
            ${submissionName(submission)} was received from ${
            submission.stateCode
        }.<br /><br />
            Submission type: ${
                SubmissionTypeRecord[submission.submissionType]
            }<br />
            Submission description: ${
                submission.submissionDescription
            }<br /><br />
            <a href="${submissionURL}">View the full submission</a>
        `,
    }
}

const newSubmissionStateEmailTemplate = (
    submission: StateSubmissionType,
    config: EmailConfiguration
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    const currentUserEmail = 'mc-review-qa@truss.works'
    const receiverEmails: string[] = [currentUserEmail].concat(
        submission.stateContacts.map((contact) => contact.email)
    )
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }${submissionName(submission)} was sent to CMS`,
        bodyText: `
            ${submissionName(submission)} was successfully submitted.

            View the full submission: ${submissionURL}`,
        bodyHTML: `
            ${submissionName(submission)} was successfully submitted.
            <br /><br />
            <a href="${submissionURL}">View the full submission</a>
        `,
    }
}

export {
    newSubmissionCMSEmailTemplate,
    newSubmissionStateEmailTemplate,
    newEmailTemplate,
}

export type { EmailTemplate }
