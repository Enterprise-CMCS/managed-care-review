import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import { packageName as generatePackageName } from 'app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from 'app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { ProgramType, CMSUserType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    // SubmissionTypeRecord,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'
import { submissionSummaryURL } from '../generateURLs'

export const qaStateEmail = async (
    formData: HealthPlanFormDataType,
    submitterEmails: string[],
    cmsRequestor: CMSUserType,
    config: EmailConfiguration,
    statePrograms: ProgramType[],
    dateAsked: Date
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []
    formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findPackagePrograms(formData, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        formData.stateCode,
        formData.stateNumber,
        formData.programIDs,
        packagePrograms
    )

    const packageURL = submissionSummaryURL(formData.id, config.baseUrl)

    const data = {
        packageName,
        submissionURL: packageURL,
        cmsRequestorEmail: cmsRequestor.email,
        cmsRequestorName: `${cmsRequestor.givenName} ${cmsRequestor.familyName}`,
        cmsRequestorDivision: cmsRequestor.divisionAssignment,
        dateAsked: formatCalendarDate(dateAsked),
    }

    const result = await renderTemplate<typeof data>('qaStateEmail', data)

    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            replyToAddresses: [config.helpDeskEmail],
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }Questions sent for ${packageName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
