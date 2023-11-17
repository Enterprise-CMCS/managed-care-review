import type { HealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { packageName as generatePackageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { formatEmailAddresses, pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { ProgramType, CMSUserType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    renderTemplate,
    findPackagePrograms,
} from '../templateHelpers'
import { submissionSummaryURL } from '../generateURLs'
 
export const QAStateEmail = async (
    formData: HealthPlanFormDataType,
    submitterEmails: string[],
    cmsRequestor: CMSUserType,
    config: EmailConfiguration,
    statePrograms: ProgramType[]
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
        cmsRequestorDivision: cmsRequestor.divisionAssignment
    }

    const result = await renderTemplate<typeof data>(
        'QAStateEmail',
        data
    )

    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            sourceEmail: config.emailSource,
            replyToAddresses: [config.helpDeskEmail],
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${packageName} was sent to CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
