import * as Eta from 'eta'
import * as path from 'path'

import type {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
    SubmissionType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import type { EmailConfiguration, StateAnalystsEmails } from '.'
import type { ProgramType } from '../domain-models'
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

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

// Util Functions
const handleAsCHIPSubmission = (
    pkg: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType
): boolean => {
    //  This const is deprecated. No longer in use once we added population covered question, code remains only for backwards compatibility for existing Mississippi submissions.
    const LEGACY_CHIP_PROGRAMS_UUID = {
        MS: '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
    }

    if (pkg.populationCovered === 'CHIP') {
        return true
    } else if (!pkg.populationCovered && pkg.stateCode === 'MS') {
        const programIDs = findAllPackageProgramIds(pkg)
        return programIDs.some(
            (id: string) => LEGACY_CHIP_PROGRAMS_UUID.MS === id
        )
    } else {
        return false
    }
}

// Filter reviewers email list to ensure CHIP programs and state of PR submission do not include OACT and DMCP emails.
const filterChipAndPRSubmissionReviewers = (
    reviewers: string[],
    config: EmailConfiguration
) => {
    const { oactEmails, dmcpEmails } = config

    return reviewers.filter(
        (email) => !dmcpEmails.includes(email) && !oactEmails.includes(email)
    )
}

/* 
    Determine reviewers for a given health plan package and state
    - devReviewTeamEmails added to all emails by default
    - dmcpEmails added in both CONTRACT_ONLY and CONTRACT_AND_RATES
    - oactEmails added for CONTRACT_AND_RATES
    - dmco is added to emails via state analysts
    
    Return should be wrapped in pruneDuplicate to ensure even if config is added twice, we get unique list of reviewers
*/
const generateCMSReviewerEmails = (
    config: EmailConfiguration,
    pkg: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType,
    stateAnalystsEmails: StateAnalystsEmails
): string[] | Error => {
    if (
        pkg.submissionType !== 'CONTRACT_AND_RATES' &&
        pkg.submissionType !== 'CONTRACT_ONLY'
    ) {
        return new Error(
            `generateCMSReviewerEmails does not currently support submission type: ${pkg.submissionType}.`
        )
    }

    const { oactEmails, dmcpEmails } = config
    let reviewers: string[] = []

    if (pkg.submissionType === 'CONTRACT_ONLY') {
        // Contract submissions reviewer emails
        reviewers = [
            ...config.devReviewTeamEmails,
            ...stateAnalystsEmails,
            ...dmcpEmails,
        ]
    } else if (pkg.submissionType === 'CONTRACT_AND_RATES') {
        //Contract and rate submissions reviewer emails.
        reviewers = [
            ...config.devReviewTeamEmails,
            ...stateAnalystsEmails,
            ...dmcpEmails,
            ...oactEmails,
        ]
    }

    //Remove OACT and DMCP emails from CHIP or State of PR submissions
    if (handleAsCHIPSubmission(pkg) || pkg.stateCode === 'PR') {
        reviewers = filterChipAndPRSubmissionReviewers(reviewers, config)
    }

    return pruneDuplicateEmails(reviewers)
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
    handleAsCHIPSubmission,
    generateCMSReviewerEmails,
    renderTemplate,
    SubmissionTypeRecord,
    findAllPackageProgramIds,
    findPackagePrograms,
    filterChipAndPRSubmissionReviewers,
}
