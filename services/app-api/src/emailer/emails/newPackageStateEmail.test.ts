import {
    testEmailConfig,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockUser,
} from '../../testHelpers/emailerHelpers'
import { LockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { newPackageStateEmail } from './index'
import { formatRateNameDate } from '../../../../app-web/src/common-code/dateHelpers'

test('to addresses list includes current user', async () => {
    const sub = mockContractOnlyFormData()
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'some-title',
        user,
        testEmailConfig
    )
    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.arrayContaining([user.email]),
        })
    )
})

test('to addresses list includes all state contacts on submission', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractOnlyFormData(),
        stateContacts: [
            {
                name: 'test1',
                titleRole: 'Foo1',
                email: 'test1@example.com',
            },
            {
                name: 'test2',
                titleRole: 'Foo2',
                email: 'test2@example.com',
            },
        ],
    }
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'some-title',
        user,
        testEmailConfig
    )
    sub.stateContacts.forEach((contact) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([contact.email]),
            })
        )
    })
})

test('subject line is correct and clearly states submission is complete', async () => {
    const sub = mockContractOnlyFormData()
    const name = 'FL-MMA-001'
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        name,
        user,
        testEmailConfig
    )

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was sent to CMS`),
            bodyText: expect.stringContaining(
                `${name} was successfully submitted.`
            ),
        })
    )
})

test('includes mcog, rate, and team email addresses', async () => {
    const sub = mockContractOnlyFormData()
    const name = 'FL-MMA-001'
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        name,
        user,
        testEmailConfig
    )

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was sent to CMS`),
            bodyText: expect.stringContaining(
                `please reach out to mcog@example.com`
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was sent to CMS`),
            bodyText: expect.stringContaining(
                `please reach out to rates@example.com`
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was sent to CMS`),
            bodyText: expect.stringContaining(
                `please reach out to mc-review@example.com`
            ),
        })
    )
})

test('includes link to submission', async () => {
    const sub = mockContractAmendmentFormData()
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'some-title',
        user,
        testEmailConfig
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                `http://localhost/submissions/${sub.id}`
            ),
        })
    )
})

test('includes information about what is next', async () => {
    const sub = mockContractAmendmentFormData()
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'some-title',
        user,
        testEmailConfig
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('What comes next:'),
        })
    )
})

test('includes expected data summary for a contract and rates submission State email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
    }
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'some-title',
        user,
        testEmailConfig
    )
    const rateName = `some-title-RATE-20210101-20220101-CERTIFICATION-${formatRateNameDate(
        new Date()
    )}`

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action and rate certification'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rating period: 01/01/2021 to 01/01/2022'
            ),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Contract effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(rateName),
        })
    )
})

test('includes expected data summary for a rate amendment submission State email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        rateType: 'AMENDMENT',
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        rateAmendmentInfo: {
            effectiveDateStart: new Date('06/05/2021'),
            effectiveDateEnd: new Date('12/31/2021'),
        },
    }
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'some-title',
        user,
        testEmailConfig
    )
    const rateName = `some-title-RATE-20210605-20211231-AMENDMENT-${formatRateNameDate(
        new Date()
    )}`

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action and rate certification'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rate amendment effective dates: 06/05/2021 to 12/31/2021'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(rateName),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        rateType: 'AMENDMENT',
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        rateAmendmentInfo: {
            effectiveDateStart: new Date('06/05/2021'),
            effectiveDateEnd: new Date('12/31/2021'),
        },
    }
    const user = mockUser()
    const template = await newPackageStateEmail(
        sub,
        'MN-new-submission-snapshot',
        user,
        testEmailConfig
    )
    expect(template.bodyHTML).toMatchSnapshot()
})
