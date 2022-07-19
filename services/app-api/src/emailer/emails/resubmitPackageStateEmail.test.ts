import {
    testEmailConfig,
    mockUser,
    mockContractAndRatesFormData,
} from '../../testHelpers/emailerHelpers'
import { resubmitPackageStateEmail } from './index'
import { CalendarDate } from '../../../../app-web/src/common-code/healthPlanFormDataType'

const resubmitData = {
    packageName: 'MCR-VA-CCCPLUS-0002',
    updatedBy: 'bob@example.com',
    updatedAt: new Date('02/01/2022'),
    rateDateCertified: new Date('2020-12-01'),
    updatedReason: 'Added rate certification.',
}
const user = mockUser()
const submission = {
    ...mockContractAndRatesFormData(),
    contractDateStart: '2021-01-01' as CalendarDate,
    contractDateEnd: '2021-12-31' as CalendarDate,
    rateDateStart: '2021-02-02' as CalendarDate,
    rateDateEnd: '2021-11-31' as CalendarDate,
    rateDateCertified: '2020-12-01' as CalendarDate,
}
test('contains correct subject and clearly states successful resubmission', async () => {
    const template = await resubmitPackageStateEmail(
        submission,
        user,
        resubmitData,
        testEmailConfig
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `${resubmitData.packageName} was resubmitted`
            ),
            bodyText: expect.stringMatching(
                `${resubmitData.packageName} was successfully resubmitted`
            ),
        })
    )
})

test('contains correct information in body of email', async () => {
    const template = await resubmitPackageStateEmail(
        submission,
        user,
        resubmitData,
        testEmailConfig
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Submitted by: bob@example.com/),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Updated on: 02\/01\/2022/),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /Changes made: Added rate certification./
            ),
        })
    )
    expect.objectContaining({
        bodyText: expect.stringMatching(
            /If you need to make any further changes, please contact CMS./
        ),
    })
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})

test('renders overall email as expected', async () => {
    const template = await resubmitPackageStateEmail(
        submission,
        user,
        resubmitData,
        testEmailConfig
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
