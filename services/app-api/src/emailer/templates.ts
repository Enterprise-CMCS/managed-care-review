import { URL } from 'url'
import * as Eta from 'eta'
import * as path from 'path'

import {
    LockedHealthPlanFormDataType,
    SubmissionType,
    UnlockedHealthPlanFormDataType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { UserType } from '../domain-models'
import { formatCalendarDate } from '../../../app-web/src/common-code/dateHelpers'
import { EmailConfiguration, EmailData, StateAnalystsEmails } from './'
import { generateRateName } from '../../../app-web/src/common-code/healthPlanFormDataType'

// load email templates
import './templates/partials.js'
import './templates/precompiled.js'

Eta.configure({
    cache: true, // Make Eta cache templates
    views: path.join(__dirname, 'templates'),
})

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

//This should reference UUIDS in the statePrograms.json in src/data/
const CHIP_PROGRAMS_UUID = {
    MS: '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
    AS: 'e112301b-72c7-4c8f-856a-2cf8c6a1465b',
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

//Checks if at least one program is CHIP
const includesChipPrograms = (programIDs: string[]): boolean => {
    const chipProgramIds = Object.values(CHIP_PROGRAMS_UUID)
    return programIDs.some((id: string) => chipProgramIds.includes(id))
}

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

// const generateNewSubmissionData = (
//     pkg: LockedHealthPlanFormDataType,
//     packageName: string,
//     config: EmailConfiguration
// ):  => {
//     return{
//        contractDates: {
//             label:
//                 pkg.contractType === 'AMENDMENT'
//                     ? 'Contract amendment effective dates'
//                     : 'Contract effective dates',
//             start: formatCalendarDate(pkg.contractDateStart),
//             end: formatCalendarDate(pkg.contractDateEnd),
//         },
//         rateInfo: {
//             name: generateRateName(pkg, packageName),
//             dates: {
//                 label:
//                     pkg.rateType === 'NEW'
//                         ? 'Rating period'
//                         : 'Rate amendment effective dates',
//                 start: hasRateAmendmentInfo
//                     ? formatCalendarDate(
//                           pkg.rateAmendmentInfo.effectiveDateStart
//                       )
//                     : formatCalendarDate(pkg.rateDateStart),
//                 end: hasRateAmendmentInfo
//                     ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateEnd)
//                     : formatCalendarDate(pkg.rateDateEnd),
//             },
//         },
//         submissionUrl: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
// }
// }
const renderTemplate = async <T>(templateRelativePath: string, data: T) => {
    try {
        const templateHTML = await Eta.renderFile('./template', {
            data,
        })
        // TODO come back and check what the return void case is
        return templateHTML
    } catch (err) {
        console.error(err)
        throw new Error(err)
    }
}
const newPackageCMSEmail = async (
    pkg: LockedHealthPlanFormDataType,
    packageName: string,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails
): Promise<EmailData> => {
    // config
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateReviewerEmails(
        config,
        pkg,
        stateAnalystsEmails
    )

    const hasRateAmendmentInfo =
        pkg.rateType === 'AMENDMENT' && pkg.rateAmendmentInfo

    const data = {
        packageName: packageName,
        submissionType: SubmissionTypeRecord[pkg.submissionType],
        stateCode: pkg.stateCode,
        submissionDescription: pkg.submissionDescription,
        contractDatesLabel:
            pkg.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(pkg.contractDateStart),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd),
        rateName: generateRateName(pkg, packageName),
        rateDatesLabel:
            pkg.rateType === 'NEW'
                ? 'Rating period'
                : 'Rate amendment effective dates',
        rateDatesStart: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateStart)
            : formatCalendarDate(pkg.rateDateStart),
        rateDatesEnd: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateEnd)
            : formatCalendarDate(pkg.rateDateEnd),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    const bodyHTMLEta = await renderTemplate<typeof data>(
        './templates/newPackageCMSEmail',
        data
    )
    console.log(bodyHTMLEta)
    // TODO handle void an don't coerce string
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${
            isTestEnvironment ? `[${config.stage}] ` : ''
        }New Managed Care Submission: ${packageName}`,
        bodyText: stripHTMLFromTemplate(bodyHTMLEta as string),
        bodyHTML: bodyHTMLEta as string,
    }
}

const newPackageStateEmail = (
    pkg: LockedHealthPlanFormDataType,
    packageName: string,
    user: UserType,
    config: EmailConfiguration
): EmailData => {
    const currentUserEmail = user.email
    const receiverEmails: string[] = [currentUserEmail].concat(
        pkg.stateContacts.map((contact) => contact.email)
    )

    const hasRateAmendmentInfo =
        pkg.rateType === 'AMENDMENT' && pkg.rateAmendmentInfo

    const data = {
        cmsReviewHelpEmailAddress: config.cmsReviewHelpEmailAddress,
        cmsRateHelpEmailAddress: config.cmsRateHelpEmailAddress,
        cmsDevTeamHelpEmailAddress: config.cmsDevTeamHelpEmailAddress,
        packageName: packageName,
        submissionType: SubmissionTypeRecord[pkg.submissionType],
        submissionDescription: pkg.submissionDescription,
        contractDatesLabel:
            pkg.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(pkg.contractDateStart),
        contractDatesEnd: formatCalendarDate(pkg.contractDateEnd),
        rateName: generateRateName(pkg, packageName),
        rateDatesLabel:
            pkg.rateType === 'NEW'
                ? 'Rating period'
                : 'Rate amendment effective dates',
        rateDatesStart: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateStart)
            : formatCalendarDate(pkg.rateDateStart),
        rateDatesEnd: hasRateAmendmentInfo
            ? formatCalendarDate(pkg.rateAmendmentInfo.effectiveDateEnd)
            : formatCalendarDate(pkg.rateDateEnd),
        submissionURL: new URL(`submissions/${pkg.id}`, config.baseUrl).href,
    }

    const bodyHTMLHandlebars =
        Handlebars.templates['newPackageStateEmail'](data)

    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${
            config.stage !== 'prod' ? `[${config.stage}] ` : ''
        }${packageName} was sent to CMS`,
        bodyText: stripHTMLFromTemplate(bodyHTMLHandlebars),
        bodyHTML: bodyHTMLHandlebars,
    }
}

type UpdatedEmailData = {
    packageName: string
    updatedBy: string
    updatedAt: Date
    updatedReason: string
    stateAnalystsEmail?: string[]
}

const unlockPackageCMSEmail = (
    submission: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    rateName: string,
    stateAnalystsEmails: StateAnalystsEmails
): EmailData => {
    const isTestEnvironment = config.stage !== 'prod'
    const reviewerEmails = generateReviewerEmails(
        config,
        submission,
        stateAnalystsEmails
    )
    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${rateName}<br />`
            : ''

    const bodyHTML = `Submission ${unlockData.packageName} was unlocked<br />
        <br />
        <b>Unlocked by:</b> ${unlockData.updatedBy}<br />
        <b>Unlocked on:</b> ${formatCalendarDate(unlockData.updatedAt)}<br />
        <b>Reason for unlock:</b> ${unlockData.updatedReason}<br /><br />
        ${rateNameText}
        You will receive another notification when the state resubmits.
    `
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${isTestEnvironment ? `[${config.stage}] ` : ''}${
            unlockData.packageName
        } was unlocked`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const unlockPackageStateEmail = (
    submission: UnlockedHealthPlanFormDataType,
    unlockData: UpdatedEmailData,
    config: EmailConfiguration,
    submissionName: string
): EmailData => {
    const submissionURL = new URL(
        `submissions/${submission.id}/review-and-submit`,
        config.baseUrl
    ).href
    const receiverEmails: string[] = submission.stateContacts.map(
        (contact) => contact.email
    )

    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  submissionName
              )}<br />`
            : ''

    const bodyHTML = `Submission ${
        unlockData.packageName
    } was unlocked by CMS<br />
        <br />
        <b>Unlocked by:</b> ${unlockData.updatedBy}<br />
        <b>Unlocked on:</b> ${formatCalendarDate(unlockData.updatedAt)}<br />
        <b>Reason for unlock:</b> ${unlockData.updatedReason}<br /><br />
        ${rateNameText}
        <b>You must revise the submission before CMS can continue reviewing it.<br />
        <a href="${submissionURL}">Open the submission in MC-Review to make edits.</a>
    `
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${config.stage !== 'prod' ? `[${config.stage}] ` : ''}${
            unlockData.packageName
        } was unlocked by CMS`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const resubmittedStateEmail = (
    submission: LockedHealthPlanFormDataType,
    user: UserType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration
): EmailData => {
    const currentUserEmail = user.email
    const receiverEmails: string[] = [currentUserEmail].concat(
        submission.stateContacts.map((contact) => contact.email)
    )

    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  resubmittedData.packageName
              )}<br />`
            : ''

    const bodyHTML = `Submission ${
        resubmittedData.packageName
    } was successfully resubmitted<br />
        <br />
        <b>Submitted by:</b> ${resubmittedData.updatedBy}<br />
        <b>Updated on:</b> ${formatCalendarDate(
            resubmittedData.updatedAt
        )}<br />
        <b>Changes made:</b> ${resubmittedData.updatedReason}<br />
        ${rateNameText}
        <br />
        <p>If you need to make any further changes, please contact CMS.</p>
    `
    return {
        toAddresses: receiverEmails,
        sourceEmail: config.emailSource,
        subject: `${config.stage !== 'prod' ? `[${config.stage}] ` : ''}${
            resubmittedData.packageName
        } was resubmitted`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

const resubmittedCMSEmail = (
    submission: LockedHealthPlanFormDataType,
    resubmittedData: UpdatedEmailData,
    config: EmailConfiguration,
    stateAnalystsEmails: StateAnalystsEmails
): EmailData => {
    const reviewerEmails = generateReviewerEmails(
        config,
        submission,
        stateAnalystsEmails
    )
    const submissionURL = new URL(
        `submissions/${submission.id}`,
        config.baseUrl
    ).href
    const rateNameText =
        submission.submissionType === 'CONTRACT_AND_RATES'
            ? `<b>Rate name</b>: ${generateRateName(
                  submission,
                  resubmittedData.packageName
              )}<br />`
            : ''

    const bodyHTML = `The state completed their edits on submission ${
        resubmittedData.packageName
    }<br />
        <br />
        <b>Submitted by:</b> ${resubmittedData.updatedBy}<br />
        <b>Updated on:</b> ${formatCalendarDate(
            resubmittedData.updatedAt
        )}<br />
        <b>Changes made:</b> ${resubmittedData.updatedReason}<br />
        ${rateNameText}
        <br />
        <a href="${submissionURL}">View submission</a>
    `
    return {
        toAddresses: reviewerEmails,
        sourceEmail: config.emailSource,
        subject: `${config.stage !== 'prod' ? `[${config.stage}] ` : ''}${
            resubmittedData.packageName
        } was resubmitted`,
        bodyText: stripHTMLFromTemplate(bodyHTML),
        bodyHTML: bodyHTML,
    }
}

export {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedStateEmail,
    resubmittedCMSEmail,
    CHIP_PROGRAMS_UUID,
}

export type { UpdatedEmailData }
