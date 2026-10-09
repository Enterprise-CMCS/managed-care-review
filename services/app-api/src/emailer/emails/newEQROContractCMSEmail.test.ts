import type { ContractType } from '../../domain-models'
import {
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { newEQROContractCMSEmail } from './newEQROContractCMSEmail'
import { packageName } from '@mc-review/submissions'

it('includes DMCO inbox on EQRO submissions subject to review', async () => {
    const sub: ContractType = mockEQROContract()
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const name = packageName(
        sub.stateCode,
        sub.stateNumber,
        sub.packageSubmissions[0].contractRevision.formData.programIDs,
        defaultStatePrograms
    )
    const result = await newEQROContractCMSEmail(
        sub,
        emailConfig,
        defaultStatePrograms
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }

    expect(result).toEqual(
        expect.objectContaining({
            subject: `[${emailConfig.stage}] New EQRO Submission: ${name} is subject to CMS Review`,
            toAddresses: expect.arrayContaining(emailConfig.dmcoEmails),
        })
    )
})

it('includes DMCO inbox on EQRO submissions not subject to review', async () => {
    const sub: ContractType = mockEQROContract()
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const name = packageName(
        sub.stateCode,
        sub.stateNumber,
        sub.packageSubmissions[0].contractRevision.formData.programIDs,
        defaultStatePrograms
    )

    //modify contract to not be subject to review
    sub.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoEqrOrRelatedActivities = false
    sub.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoNewOptionalActivity = false
    sub.packageSubmissions[0].contractRevision.formData.eqroProvisionNewMcoEqrRelatedActivities = false

    const result = await newEQROContractCMSEmail(
        sub,
        emailConfig,
        defaultStatePrograms
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }

    expect(result.subject).toBe(
        `[${emailConfig.stage}] New EQRO Submission: ${name} is not subject to CMS Review`
    )
    expect(result).toEqual(
        expect.objectContaining({
            toAddresses: expect.arrayContaining(emailConfig.dmcoEmails),
        })
    )
})

it('renders overall email for a new EQRO contract submission', async () => {
    const sub: ContractType = mockEQROContract()
    const defaultStatePrograms = mockMNState().programs
    const result = await newEQROContractCMSEmail(
        sub,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
