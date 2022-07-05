import { testEmailConfig } from '../../testHelpers/emailerHelpers'
import { unlockPackageStateEmail } from './index'
import { unlockedWithFullContracts } from '../../../../app-web/src/common-code/healthPlanFormDataMocks'

const unlockData = {
    packageName: 'MCR-VA-CCCPLUS-0002',
    updatedBy: 'josh@example.com',
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Adding rate certification.',
}
const submissionName = 'MN-PMAP-0001'
const sub = unlockedWithFullContracts()
const template = unlockPackageStateEmail(
    sub,
    unlockData,
    testEmailConfig,
    submissionName
)

test('subject line is correct and clearly states submission is unlocked', () => {
    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `${unlockData.packageName} was unlocked by CMS`
            ),
        })
    )
})
test('unlocked by includes correct email address', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Unlocked by: josh/),
        })
    )
})
test('unlocked on includes correct date', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Unlocked on: 02/),
        })
    )
})
test('includes correct reason', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /Reason for unlock: Adding rate certification./
            ),
        })
    )
})
test('includes rate name', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})
test('includes instructions about revising the submission', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /You must revise the submission before CMS can continue reviewing it/
            ),
        })
    )
})

test('renders overall email as expected', async () => {
    expect(template.bodyHTML).toMatchSnapshot()
})
