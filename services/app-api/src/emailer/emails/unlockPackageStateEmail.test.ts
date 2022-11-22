import {
    testEmailConfig,
    mockUnlockedContractAndRatesFormData,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import { unlockPackageStateEmail } from './index'
import {
    generateRateName,
    packageName,
    UnlockedHealthPlanFormDataType,
} from 'app-web/src/common-code/healthPlanFormDataType'

const unlockData = {
    updatedBy: 'josh@example.com',
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Adding rate certification.',
}
const sub: UnlockedHealthPlanFormDataType = {
    ...mockUnlockedContractAndRatesFormData(),
    contractDateStart: new Date('2021-01-01'),
    contractDateEnd: new Date('2021-12-31'),
    rateInfos: [
        {
            rateType: 'NEW',
            rateDocuments: [
                {
                    s3URL: 'bar',
                    name: 'foo',
                    documentCategories: ['RATES' as const],
                },
            ],
            rateDateStart: new Date('2021-02-02'),
            rateDateEnd: new Date('2021-11-31'),
            rateDateCertified: new Date('2020-12-01'),
            rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
            rateAmendmentInfo: {
                effectiveDateStart: new Date('06/05/2021'),
                effectiveDateEnd: new Date('12/31/2021'),
            },
        },
    ],
}
const defaultStatePrograms = mockMNState().programs

test('subject line is correct and clearly states submission is unlocked', async () => {
    const name = packageName(sub, defaultStatePrograms)
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was unlocked by CMS`),
        })
    )
})

test('includes expected data summary for a contract and rates submission unlock State email', async () => {
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig,
        defaultStatePrograms
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
    //Expect only have 3 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], defaultStatePrograms)
            ),
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

test('includes expected data summary for a multi-rate contract and rates submission unlock State email', async () => {
    const sub: UnlockedHealthPlanFormDataType = {
        ...mockUnlockedContractAndRatesFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateCertified: new Date(),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
            },
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateCertified: new Date(),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
            },
            {
                rateType: 'AMENDMENT',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateCertified: new Date(),
                rateProgramIDs: [
                    'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                ],
                rateDateStart: new Date('01/01/2022'),
                rateDateEnd: new Date('01/01/2023'),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date('06/05/2021'),
                    effectiveDateEnd: new Date('12/31/2021'),
                },
            },
        ],
    }
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig,
        defaultStatePrograms
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
    //Expect only have 3 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(3)
    //First Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], defaultStatePrograms)
            ),
        })
    )
    //Second Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[1], defaultStatePrograms)
            ),
        })
    )
    //Third Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[2], defaultStatePrograms)
            ),
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
    const sub: UnlockedHealthPlanFormDataType = {
        ...mockUnlockedContractAndRatesFormData(),
        rateType: 'AMENDMENT',
        contractDateStart: new Date('2021-01-01'),
        contractDateEnd: new Date('2021-12-31'),
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateCertified: new Date('01/02/2021'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
            },
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateCertified: new Date('02/02/2022'),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
            },
        ],
    }
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
