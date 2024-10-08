import { packageName as generatePackageName } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { formatEmailAddresses, pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { ProgramType, ContractType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    SubmissionTypeRecord,
    renderTemplate,
    findContractPrograms,
} from '../templateHelpers'
import { submissionSummaryURL } from '../generateURLs'

export const newContractStateEmail = async (
    contract: ContractType,
    submitterEmails: string[],
    config: EmailConfiguration,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []
    const contractRev = contract.packageSubmissions[0].contractRevision
    const formData = contractRev.formData
    formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })
    const receiverEmails = pruneDuplicateEmails([
        ...stateContactEmails,
        ...submitterEmails,
        ...config.devReviewTeamEmails,
    ])

    //This checks to make sure all programs contained in submission exists for the state.
    const packagePrograms = findContractPrograms(contractRev, statePrograms)

    if (packagePrograms instanceof Error) {
        return packagePrograms
    }

    const packageName = generatePackageName(
        contract.stateCode,
        contract.stateNumber,
        formData.programIDs,
        packagePrograms
    )

    const isContractAndRates =
        formData.submissionType === 'CONTRACT_AND_RATES' &&
        Boolean(contract.packageSubmissions[0].rateRevisions.length)

    const contractURL = submissionSummaryURL(contract.id, config.baseUrl)

    const data = {
        shouldIncludeRates: isContractAndRates,
        cmsReviewHelpEmailAddress: formatEmailAddresses(
            config.cmsReviewHelpEmailAddress
        ),
        cmsRateHelpEmailAddress: formatEmailAddresses(
            config.cmsRateHelpEmailAddress
        ),
        helpDeskEmail: formatEmailAddresses(config.helpDeskEmail),
        packageName,
        submissionType: SubmissionTypeRecord[formData.submissionType],
        submissionDescription: formData.submissionDescription,
        contractType: formData.contractType,
        contractDatesLabel:
            formData.contractType === 'AMENDMENT'
                ? 'Contract amendment effective dates'
                : 'Contract effective dates',
        contractDatesStart: formatCalendarDate(formData.contractDateStart),
        contractDatesEnd: formatCalendarDate(formData.contractDateEnd),
        rateInfos:
            isContractAndRates &&
            contract.packageSubmissions[0].rateRevisions.map((rate) => ({
                rateName: rate.formData.rateCertificationName,
                rateDateLabel:
                    rate.formData.rateType === 'NEW'
                        ? 'Rating period'
                        : 'Rate amendment effective dates',
                rateDatesStart:
                    rate.formData.rateType === 'AMENDMENT'
                        ? formatCalendarDate(
                              rate.formData.amendmentEffectiveDateStart
                          )
                        : formatCalendarDate(rate.formData.rateDateStart),
                rateDatesEnd:
                    rate.formData.rateType === 'AMENDMENT'
                        ? formatCalendarDate(
                              rate.formData.amendmentEffectiveDateEnd
                          )
                        : formatCalendarDate(rate.formData.rateDateEnd),
            })),
        submissionURL: contractURL,
    }

    const result = await renderTemplate<typeof data>(
        'newContractStateEmail',
        data
    )

    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${packageName} was sent to CMS`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
