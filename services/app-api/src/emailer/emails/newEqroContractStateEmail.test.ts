import type { ContractType } from '../../domain-models'
import {
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { newEqroContractStateEmail } from './newEqroContractStateEmail'
import { packageName } from '@mc-review/submissions'

describe('newEqroContractStateEmail', () => {
    const submitterEmails = ['submitter1@example.com', 'submitter2@example.com']

    it('renders email for new EQRO contract subject to review as expected', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('renders email for new EQRO contract NOT subject to review as expected', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        contract.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoEqrOrRelatedActivities =
            false
        contract.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoNewOptionalActivity =
            false
        contract.packageSubmissions[0].contractRevision.formData.eqroProvisionNewMcoEqrRelatedActivities =
            false

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('to addresses list does not include duplicate emails', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        contract.packageSubmissions[0].contractRevision.formData.stateContacts =
            [
                {
                    name: 'Dupe Contact',
                    titleRole: 'dupe1',
                    email: 'dupe1@example.com',
                },
                {
                    name: 'Dupe Contact',
                    titleRole: 'dupe1',
                    email: 'dupe1@example.com',
                },
            ]

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual([
            'dupe1@example.com',
            ...submitterEmails,
            ...testEmailConfig().devReviewTeamEmails,
        ])
    })

    it('to addresses includes all state contacts on submission', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        contract.packageSubmissions[0].contractRevision.formData.stateContacts =
            [
                {
                    name: 'State Contact 1',
                    titleRole: 'stateContact1',
                    email: 'stateContact1@example.com',
                },
                {
                    name: 'State Contact 2',
                    titleRole: 'stateContact2',
                    email: 'stateContact2@example.com',
                },
            ]

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        contract.packageSubmissions[0].contractRevision.formData.stateContacts.forEach(
            (contact) => {
                expect(template).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.arrayContaining([contact.email]),
                    })
                )
            }
        )
    })

    it('to addresses includes submitter emails', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining(submitterEmails),
            })
        )
    })

    it('Subject line and test are correct for a contract NOT subject to review', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()
        const name = packageName(
            contract.stateCode,
            contract.stateNumber,
            contract.packageSubmissions[0].contractRevision.formData.programIDs,
            statePrograms
        )

        contract.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoEqrOrRelatedActivities =
            false
        contract.packageSubmissions[0].contractRevision.formData.eqroProvisionMcoNewOptionalActivity =
            false
        contract.packageSubmissions[0].contractRevision.formData.eqroProvisionNewMcoEqrRelatedActivities =
            false

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${name} is not subject to CMS review and approval`
                ),
                bodyText: expect.stringContaining(
                    `Based on the state's responses, ${name} is not subject to CMS review and approval.`
                ),
            })
        )
    })

    it('Subject line and test are correct for a contract subject to review', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()
        const name = packageName(
            contract.stateCode,
            contract.stateNumber,
            contract.packageSubmissions[0].contractRevision.formData.programIDs,
            statePrograms
        )

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${name} is subject to CMS review and approval`
                ),
                bodyText: expect.stringContaining(
                    `Based on the state's responses, ${name} is subject to CMS review and approval.`
                ),
            })
        )
    })

    it('should include link to submission', async () => {
        const contract: ContractType = mockEQROContract()
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await newEqroContractStateEmail(
            contract,
            submitterEmails,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    `http://localhost/submissions/eqro/${contract.id}`
                ),
            })
        )
    })
})
