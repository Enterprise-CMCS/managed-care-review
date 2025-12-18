import type { ContractType } from '../../domain-models'
import {
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { newEQROContractCMSEmail } from './newEQROContractCMSEmail'

it('includes DMCO inbox on EQRO submissions subject to review', async () => {
    const sub: ContractType = mockEQROContract()
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
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
            subject: expect.stringContaining(
                'is subject to CMS review and approval'
            ),
            toAddresses: expect.arrayContaining(emailConfig.dmcoEmails),
        })
    )
})

it('does not include DMCO inbox on EQRO submissions not subject to review', async () => {
    const sub: ContractType = mockEQROContract()
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()

    //modify contract to not be subject to review
    sub.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoEqrOrRelatedActivities =
        false
    sub.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoNewOptionalActivity =
        false
    sub.packageSubmissions[0].contractRevision.formData.eqroProvisionNewMcoEqrRelatedActivities =
        false

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

    expect(result.subject).toContain(
        'is not subject to CMS review and approval'
    )
    expect(result.toAddresses).toEqual(emailConfig.devReviewTeamEmails)
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
