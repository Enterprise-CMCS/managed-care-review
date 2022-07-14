import { testEmailConfig } from '../../testHelpers/emailerHelpers'
import { unlockPackageStateEmail } from './index'
import { unlockedWithFullContracts } from '../../../../app-web/src/common-code/healthPlanFormDataMocks'

const unlockData = {
    packageName: 'MCR-VA-CCCPLUS-0002',
    updatedBy: 'josh@example.com',
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Adding rate certification.',
}
const sub = {
    ...unlockedWithFullContracts(),
    contractDateStart: new Date('2021-01-01'),
    contractDateEnd: new Date('2021-12-31'),
    rateDateStart: new Date('2021-02-02'),
    rateDateEnd: new Date('2021-11-31'),
    rateDateCertified: new Date('2020-12-01'),
    rateAmendmentInfo: {
        effectiveDateStart: new Date('06/05/2021'),
        effectiveDateEnd: new Date('12/31/2021'),
    },
}

test('subject line is correct and clearly states submission is unlocked', async () => {
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `${unlockData.packageName} was unlocked by CMS`
            ),
        })
    )
})

test('body content is correct', async () => {
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Unlocked by: josh/),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Unlocked on: 02/),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /Reason for unlock: Adding rate certification./
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /You must revise the submission before CMS can continue reviewing it/
            ),
        })
    )
})

test('renders overall email as expected', async () => {
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
