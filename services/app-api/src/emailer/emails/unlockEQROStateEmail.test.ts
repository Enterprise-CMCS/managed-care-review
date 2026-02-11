import {
    testEmailConfig,
    mockMNState,
    mockUnlockedContract,
} from '../../testHelpers/emailerHelpers'
import { unlockEQROStateEmail } from './index'
import { packageName } from '@mc-review/submissions'

describe.skip('unlockEQROStateEmail', () => {
    const unlockData = {
        updatedBy: {
            email: 'josh@example.com',
            role: 'CMS_USER' as const,
            givenName: 'Josh',
            familyName: 'Knope',
        },
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Fixing mistake',
    }

    const defaultStatePrograms = mockMNState().programs
    const defaultSubmitters = ['test1@example.com', 'test2@example.com']
    const emailConfig = testEmailConfig()

    it('renders State email for unlocked EQRO contract as expected', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const template = await unlockEQROStateEmail(
            eqroSub,
            unlockData,
            emailConfig,
            defaultStatePrograms,
            defaultSubmitters
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

        const template = await unlockEQROStateEmail(
            eqroSub,
            unlockData,
            emailConfig,
            defaultStatePrograms,
            defaultSubmitters
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining(defaultSubmitters),
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

        const template = await unlockEQROStateEmail(
            eqroSub,
            unlockData,
            emailConfig,
            defaultStatePrograms,
            defaultSubmitters
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
