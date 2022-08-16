import {
    testEmailConfig,
    mockUser,
    mockContractAndRatesFormData,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import { resubmitPackageStateEmail } from './index'
import { findPackagePrograms } from '../templateHelpers'
import { packageName, LockedHealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

const resubmitData = {
    updatedBy: 'bob@example.com',
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Added rate certification.',
}
const user = mockUser()
const submission: LockedHealthPlanFormDataType = {
    ...mockContractAndRatesFormData(),
    contractDateStart: '2021-01-01',
    contractDateEnd: '2021-12-31',
    rateDateStart: '2021-02-02',
    rateDateEnd: '2021-11-31',
    rateDateCertified: '2020-12-01',
}
const defaultStatePrograms = mockMNState().programs
const packagePrograms = findPackagePrograms(submission, defaultStatePrograms)

if (packagePrograms instanceof Error) {
    throw new Error(packagePrograms.message)
}

test('contains correct subject and clearly states successful resubmission', async () => {
    const name = packageName(submission, packagePrograms)
    const template = await resubmitPackageStateEmail(
        submission,
        user,
        resubmitData,
        testEmailConfig,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was resubmitted`),
            bodyText: expect.stringMatching(
                `${name} was successfully resubmitted`
            ),
        })
    )
})

test('contains correct information in body of email', async () => {
    const template = await resubmitPackageStateEmail(
        submission,
        user,
        resubmitData,
        testEmailConfig,
        defaultStatePrograms
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
        testEmailConfig,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
