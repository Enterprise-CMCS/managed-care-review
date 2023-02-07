import * as Eta from 'eta'
import * as path from 'path'

import {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
    SubmissionType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { EmailConfiguration, StateAnalystsEmails } from '.'
import { ProgramType } from '../domain-models'
import { logError } from '../logger'
import { pruneDuplicateEmails } from './formatters'

// ETA SETUP
Eta.configure({
    cache: true, // Make Eta cache templates
    views: [
        path.join(__dirname, 'etaTemplates'),
        path.join(__dirname, '../../'), // this is intentional - we need to have this path here to be able to find the files from the graphql lambda when in serverless deployed app
    ],
})

const renderTemplate = async <T extends object>(
    templateName: string,
    data: T
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
const generateCMSReviewerEmails = (
    config: EmailConfiguration,
    pkg: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType,
    stateAnalystsEmails: StateAnalystsEmails
): string[] | Error => {
    const oactEmails: string[] = config.ratesReviewSharedEmails // TODO: change to config.oact

    const dmcpOACTSharedEmail: string = config.cmsRateHelpEmailAddress // TODO: change to config.dmcp

    // CHIP programs and state of PR submission does not include OACT and DMCP emails.
    const filterChipAndPRSubmission = (reviewers: string[]) =>
        reviewers.filter(
            (email) =>
                email !== dmcpOACTSharedEmail && !oactEmails.includes(email)
        )

    //This list of program IDs combines programs specified for contract certification and rate certification.
    const programIDs = findAllPackageProgramIds(pkg)

    // dmcpEmail is added in both CONTRACT_ONLY and CONTRACT_AND_RATES, in case it wasn't included in cmsReviewSharedEmails.
    // cmsReviewSharedEmail emails are pulled from parameter store /configuration/email/reviewTeamAddresses.
    // pruneDuplicateEmails function will remove dmcpEmail if it's a duplicate.
    if (pkg.submissionType === 'CONTRACT_ONLY') {
        // Contract submissions reviewer emails
        let reviewers = pruneDuplicateEmails([
            ...config.cmsReviewSharedEmails,
            ...stateAnalystsEmails,
            dmcpOACTSharedEmail,
        ])

        //Remove OACT and DMCP emails from CHIP or State of PR submissions
        if (includesChipPrograms(programIDs) || pkg.stateCode === 'PR') {
            reviewers = filterChipAndPRSubmission(reviewers)
        }

        return reviewers
    } else if (pkg.submissionType === 'CONTRACT_AND_RATES') {
        //Contract and rate submissions reviewer emails.
        let reviewers = pruneDuplicateEmails([
            ...config.cmsReviewSharedEmails,
            ...stateAnalystsEmails,
            dmcpOACTSharedEmail,
            ...oactEmails,
        ])

        //Remove OACT nad DMCP emails from CHIP or State of PR submissions
        if (includesChipPrograms(programIDs) || pkg.stateCode === 'PR') {
            reviewers = filterChipAndPRSubmission(reviewers)
        }

        return reviewers
    } else {
        return new Error(
            `generateCMSReviewerEmails does not currently support submission type: ${pkg.submissionType}.`
        )
    }
}

//Finds all package program and rate program ids in a package and combines them into one array removing duplicates.
const findAllPackageProgramIds = (
    pkg: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType
): string[] => {
    const programs = [...pkg.programIDs]
    if (pkg.submissionType === 'CONTRACT_AND_RATES' && !!pkg.rateInfos.length) {
        const ratePrograms = pkg.rateInfos.flatMap(
            (rateInfo) => rateInfo.rateProgramIDs
        )
        if (ratePrograms?.length) {
            ratePrograms.forEach(
                (id) => id && !programs.includes(id) && programs.push(id)
            )
        }
    }
    return programs
}

//Find state programs from package programs ids
const findPackagePrograms = (
    pkg: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType,
    statePrograms: ProgramType[]
): ProgramType[] | Error => {
    const programIDs = findAllPackageProgramIds(pkg)
    const programs = statePrograms.filter((program) =>
        programIDs.includes(program.id)
    )
    if (!programs || programs.length !== programIDs.length) {
        const errMessage = `Can't find programs ${programIDs} from state ${pkg.stateCode}`
        logError('newPackageCMSEmail', errMessage)
        return new Error(errMessage)
    }

    return programs
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
    generateCMSReviewerEmails,
    renderTemplate,
    SubmissionTypeRecord,
    findAllPackageProgramIds,
    findPackagePrograms,
}
