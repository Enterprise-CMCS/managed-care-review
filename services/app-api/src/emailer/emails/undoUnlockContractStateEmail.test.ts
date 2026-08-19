import {
    mockContract,
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { undoUnlockContractStateEmail } from './undoUnlockContractStateEmail'

const submitterEmails = ['submitter1@example.com']

it('sends a state email to the state contacts and submitters when the unlock is undone', async () => {
    const contract = mockContract()
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const stateContactEmails =
        contract.packageSubmissions[0].contractRevision.formData.stateContacts.map(
            (contact) => contact.email
        )
    assert.isAtLeast(stateContactEmails.length, 1)
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractStateEmail(
        contract,
        updatedInfo,
        submitterEmails,
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
                ...stateContactEmails,
                ...submitterEmails,
                ...emailConfig.devReviewTeamEmails,
            ]),
            bodyText: expect.stringContaining('Rate name:'),
        })
    )
    expect(result.bodyText).not.toContain('Review decision:')
    expect(result.toAddresses).not.toEqual(
        expect.arrayContaining(emailConfig.dmcoEmails)
    )
})

it('includes assitance contact info', async () => {
    const contract = mockContract()
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractStateEmail(
        contract,
        updatedInfo,
        submitterEmails,
        defaultStatePrograms,
        emailConfig
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }
    expect(result.bodyText).toContain(
        'If you need assistance or to make changes to your submission:'
    )
    expect(result.bodyText).toContain('mailto:mcog@example.com')
    expect(result.bodyText).toContain('mailto:rates@example.com')
    expect(result.bodyText).toContain('mailto:MC_Review_HelpDesk@example.com')
})

it('EQRO subject to review has additional content', async () => {
    const contract = mockEQROContract()
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractStateEmail(
        contract,
        updatedInfo,
        submitterEmails,
        defaultStatePrograms,
        emailConfig
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }
    expect(result.bodyText).toContain('What comes next:')
})

it('EQRO not subject to review has additional content', async () => {
    const contract = mockEQROContract()
    // Make it so the EQRO contract is not subject to review
    contract.packageSubmissions[0].contractRevision.formData.managedCareEntities =
        ['PCCM']
    const info = contract.packageSubmissions[0].submitInfo
    const updatedInfo = {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()
    const result = await undoUnlockContractStateEmail(
        contract,
        updatedInfo,
        submitterEmails,
        defaultStatePrograms,
        emailConfig
    )

    if (result instanceof Error) {
        throw new Error(
            `Unexpected error: email template returned an error. ${result.message}`
        )
    }
    expect(result.bodyText).toContain(
        'As a reminder, all contracts with EQROs must:'
    )
})
