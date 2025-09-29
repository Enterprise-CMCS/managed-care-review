import { formatCalendarDate } from '@mc-review/dates'
import type { ProgramType, RateType } from '../../domain-models'
import type { EmailData, EmailConfiguration } from '../emailer'
import { renderTemplate, stripHTMLFromTemplate } from '../templateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import { validateAndParseWithdrawnRate } from './sendWithdrawnRateCMSEmail'

type WithdrawnFromContractData = {
    contractName: string
    submissionURL: string
}

type WithdrawnRateEtaData = {
    rateName: string
    withdrawnBy: string //email
    withdrawnDate: string // mm/dd/yyyy format in PT timezone.
    withdrawnReason: string
    withdrawnFromContractData: WithdrawnFromContractData[]
}

export const sendWithdrawnRateStateEmail = async (
    config: EmailConfiguration,
    rate: RateType,
    statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    // validate the withdrawn rate
    const withdrawnRateData = validateAndParseWithdrawnRate(
        rate,
        statePrograms,
        config
    )

    if (withdrawnRateData instanceof Error) {
        return withdrawnRateData
    }

    const {
        latestRateRev,
        latestAction,
        withdrawnFromContractData,
        stateContactEmails,
    } = withdrawnRateData

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...config.devReviewTeamEmails,
    ])

    const etaData: WithdrawnRateEtaData = {
        rateName: latestRateRev.formData.rateCertificationName!,
        withdrawnBy: latestAction.updatedBy.email,
        withdrawnDate: formatCalendarDate(
            latestAction.updatedAt,
            'America/Los_Angeles'
        ),
        withdrawnReason: latestAction.updatedReason,
        withdrawnFromContractData,
    }

    const template = await renderTemplate<WithdrawnRateEtaData>(
        'sendWithdrawnRateStateEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${etaData.rateName} was withdrawn`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
