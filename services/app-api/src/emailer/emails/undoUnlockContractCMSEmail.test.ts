import {
    mockContract,
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { undoUnlockContractCMSEmail } from './undoUnlockContractCMSEmail'

it('sends a CMS email to the DMCO inbox and assigned DMCO users when the unlock is undone', async () => {
    const contract = mockContract()
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const assignedUserEmails = ['roku@example.com', 'izumi@example.com']
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractCMSEmail(
        contract,
        updatedInfo,
        assignedUserEmails,
        defaultStatePrograms,
        emailConfig
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }
    expect(result).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining('unlock was undone by CMS'),
            toAddresses: expect.arrayContaining([
                ...assignedUserEmails,
                ...emailConfig.dmcoEmails,
                ...emailConfig.devReviewTeamEmails,
            ]),
            bodyText: expect.stringContaining('Rate name:'),
        })
    )
    expect(result.bodyText).not.toContain('Review decision:')
})

it('has different content for EQRO', async () => {
    const contract = mockEQROContract()
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const assignedUserEmails = ['roku@example.com', 'izumi@example.com']
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractCMSEmail(
        contract,
        updatedInfo,
        assignedUserEmails,
        defaultStatePrograms,
        emailConfig
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }
    expect(result).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining('unlock was undone by CMS'),
            toAddresses: expect.arrayContaining([
                ...assignedUserEmails,
                ...emailConfig.dmcoEmails,
                ...emailConfig.devReviewTeamEmails,
            ]),
            bodyText: expect.stringContaining('Review decision:'),
        })
    )
    expect(result.bodyText).not.toContain('Rate name:')
})

it('CHIP only content is similar to EQRO', async () => {
    const contract = mockContract()
    contract.packageSubmissions[0].contractRevision.formData.populationCovered =
        'CHIP'
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const assignedUserEmails = ['roku@example.com', 'izumi@example.com']
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractCMSEmail(
        contract,
        updatedInfo,
        assignedUserEmails,
        defaultStatePrograms,
        emailConfig
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }
    expect(result.bodyText).toContain('Review decision:')
})
