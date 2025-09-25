import type {
    EmailConfiguration,
    EmailData,
    StateAnalystsEmails,
} from '../emailer'
import type { ProgramType, RateType } from '../../domain-models'
import {
    validateAndParseUnwithdrawnRate,
    type undoWithdrawnRateEtaData,
} from './sendUndoWithdrawnRateStateEmail'
import { pruneDuplicateEmails } from '../formatters'
import { formatCalendarDate } from '@mc-review/dates'
import { renderTemplate, stripHTMLFromTemplate } from '../templateHelpers'

export const sendUndoWithdrawnRateCMSEmail = async (
    rate: RateType,
    statePrograms: ProgramType[],
    stateAnalystsEmails: StateAnalystsEmails,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const undoWithdrawnRateData = validateAndParseUnwithdrawnRate(
        rate,
        statePrograms,
        config
    )

    if (undoWithdrawnRateData instanceof Error) {
        return undoWithdrawnRateData
    }

    const {
        latestStatusAction, //Contains update information
        rateInfo, //Rate name
        associatedContracts, //Contracts connected to the rate
    } = undoWithdrawnRateData

    const toAddresses = pruneDuplicateEmails([
        ...stateAnalystsEmails,
        ...config.dmcpSubmissionEmails,
        ...config.oactEmails,
        ...config.devReviewTeamEmails,
    ])

    const etaData: undoWithdrawnRateEtaData = {
        rateInfo: rateInfo,
        updatedBy: latestStatusAction.updatedBy.email,
        updatedOn: formatCalendarDate(
            latestStatusAction.updatedAt,
            'America/Los_Angeles'
        ),
        reason: latestStatusAction.updatedReason,
        associatedContracts: associatedContracts,
    }

    const template = await renderTemplate<undoWithdrawnRateEtaData>(
        'sendUndoWithdrawnRateCMSEmail',
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
            }${etaData.rateInfo.rateName} status update`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
