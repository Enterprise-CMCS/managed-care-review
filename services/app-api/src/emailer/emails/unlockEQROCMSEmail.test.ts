import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockMNState,
    mockUnlockedContract,
} from '../../testHelpers/emailerHelpers'
import { unlockEQROCMSEmail } from './index'
import { packageName } from '@mc-review/submissions'

describe('unlockEQROCMSEmail', () => {
    const unlockData = {
        updatedBy: {
            email: 'leslie@example.com',
            role: 'CMS_USER' as const,
            givenName: 'Leslie',
            familyName: 'Knope',
        },
        updatedAt: new Date('01/01/2022'),
        updatedReason: 'Hello, friend.',
    }

    const testStateAnalystEmails = testStateAnalystsEmails
    const defaultStatePrograms = mockMNState().programs
    const emailConfig = testEmailConfig()

    it('renders CMS email for unlocked EQRO contract as expected', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const template = await unlockEQROCMSEmail(
            eqroSub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('includes submitter emails as expected', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const template = await unlockEQROCMSEmail(
            eqroSub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining(testStateAnalystEmails),
            })
        )
    })

    it('subject line is correct and clearly states submission is unlocked', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const subName = packageName(
            eqroSub.stateCode,
            eqroSub.stateNumber,
            eqroSub.draftRevision.formData.programIDs,
            defaultStatePrograms
        )

        const template = await unlockEQROCMSEmail(
            eqroSub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`${subName} was unlocked`),
            })
        )
    })
})
