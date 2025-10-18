import { packageName as generatePackageName } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
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
        contractDatesStart: formatCalendarDate(
            formData.contractDateStart,
            'UTC'
        ),
        contractDatesEnd: formatCalendarDate(formData.contractDateEnd, 'UTC'),
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
                              rate.formData.amendmentEffectiveDateStart,
                              'UTC'
                          )
                        : formatCalendarDate(
                              rate.formData.rateDateStart,
                              'UTC'
                          ),
                rateDatesEnd:
                    rate.formData.rateType === 'AMENDMENT'
                        ? formatCalendarDate(
                              rate.formData.amendmentEffectiveDateEnd,
                              'UTC'
                          )
                        : formatCalendarDate(rate.formData.rateDateEnd, 'UTC'),
            })),
        submissionURL: contractURL,
        isChipOnly: formData.populationCovered === 'CHIP',
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
