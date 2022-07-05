import {
    testEmailConfig,
    mockUser,
    mockContractAndRatesFormData,
} from '../../testHelpers/emailerHelpers'
import { resubmitPackageStateEmail } from './index'

const resubmitData = {
    packageName: 'MCR-VA-CCCPLUS-0002',
    updatedBy: 'bob@example.com',
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Added rate certification.',
}
const user = mockUser()
const submission = mockContractAndRatesFormData()
const template = resubmitPackageStateEmail(
    submission,
    user,
    resubmitData,
    testEmailConfig
)
test('contains correct subject and clearly states successful resubmission', () => {
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
test('Submitted by contains correct email address', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Submitted by: bob@example.com/),
        })
    )
})
test('Updated on contains correct date', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Updated on: 02\/01\/2022/),
        })
    )
})
test('Changes made contains correct changes made', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /Changes made: Added rate certification./
            ),
        })
    )
})
test('includes instructions for further changes', () => {
    expect.objectContaining({
        bodyText: expect.stringMatching(
            /If you need to make any further changes, please contact CMS./
        ),
    })
})
test('includes rate name', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})

test('renders overall email as expected', async () => {
    expect(template.bodyHTML).toMatchSnapshot()
})
