import * as Eta from 'eta'
import * as path from 'path'

import {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
    SubmissionType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { EmailConfiguration, StateAnalystsEmails } from '.'

// ETA SETUP
Eta.configure({
    cache: true, // Make Eta cache templates
    views: [
        path.join(__dirname, 'etaTemplates'),
        path.join(__dirname, '../../'), // this is intentional - we need to have this path here to be able to find the files from the graphql lambda when in serverless deployed app
    ],
})

const renderTemplate = async <T>(
    templateName: string,
    data: T,
    inUnitTest?: boolean
) => {
    if (!/^[a-zA-Z0-9]+$/.test(templateName)) {
        console.error(
            'CODING ERROR: templateName parameter should not include any punctuation, can only be alphanumeric characters'
        )
        return new Error(`${templateName} is not a valid template file name`)
    }
    const templatePath = `./${templateName}`

    try {
        const templateOrVoid = await Eta.renderFile(templatePath, data)

        if (typeof templateOrVoid !== 'string') {
            return new Error(
                `Could not render file ${templatePath}, no template string returned`
            )
        }
        const templateHTML = templateOrVoid as string // we know we have a string we can coerce type here to simply types upstream
        return templateHTML
    } catch (err) {
        return new Error(err)
    }
}

// SHARED EMAIL LOGIC
// Types
type UpdatedEmailData = {
    packageName: string
    updatedBy: string
    updatedAt: Date
    updatedReason: string
    stateAnalystsEmail?: string[]
}

// Constants
// This should reference UUIDS in the statePrograms.json in src/data/
const CHIP_PROGRAMS_UUID = {
    MS: '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
    AS: 'e112301b-72c7-4c8f-856a-2cf8c6a1465b',
}

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

// Util Functions
// Checks if at least one program is CHIP
const includesChipPrograms = (programIDs: string[]): boolean => {
    const chipProgramIds = Object.values(CHIP_PROGRAMS_UUID)
    return programIDs.some((id: string) => chipProgramIds.includes(id))
}

// Determine who should be notified as a reviewer for a given health plan package and state
const generateReviewerEmails = (
    config: EmailConfiguration,
    submission: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType,
    stateAnalystsEmails: StateAnalystsEmails
): string[] => {
    //Combine CMS emails along with State specific analyst emails.
    const cmsReviewSharedEmails = [
        ...config.cmsReviewSharedEmails,
        ...stateAnalystsEmails,
    ]

    //chipReviewerEmails does not include OACT and DMCP emails
    const chipReviewerEmails = cmsReviewSharedEmails.filter(
        (email) => email !== config.cmsRateHelpEmailAddress
    )
    const contractAndRateReviewerEmails = [
        ...cmsReviewSharedEmails,
        ...config.ratesReviewSharedEmails,
    ]

    if (
        submission.submissionType === 'CONTRACT_AND_RATES' &&
        submission.stateCode !== 'PR' &&
        !includesChipPrograms(submission.programIDs)
    ) {
        return contractAndRateReviewerEmails
    } else if (includesChipPrograms(submission.programIDs)) {
        return chipReviewerEmails
    }

    return cmsReviewSharedEmails
}

// Clean out HTML tags from an HTML based template
// this way we still have a text alternative for email client rendering html in plaintext
// plaintext is also referenced for unit testing
const stripHTMLFromTemplate = (template: string) => {
    let formatted = template
    // remove BR tags and replace them with line break
    formatted = formatted.replace(/<br>/gi, '\n')
    formatted = formatted.replace(/<br\s\/>/gi, '\n')
    formatted = formatted.replace(/<br\/>/gi, '\n')

    // remove P and A tags but preserve what's inside of them
    formatted = formatted.replace(/<p.*>/gi, '\n')
    formatted = formatted.replace(/<a.*href="(.*?)".*>(.*?)<\/a>/gi, ' $2 ($1)')
    // everything else
    return formatted.replace(/(<([^>]+)>)/gi, '')
}

export {
    stripHTMLFromTemplate,
    CHIP_PROGRAMS_UUID,
    includesChipPrograms,
    generateReviewerEmails,
    renderTemplate,
    SubmissionTypeRecord,
}

export type { UpdatedEmailData }
