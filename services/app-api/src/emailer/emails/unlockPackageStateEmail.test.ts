import {
    testEmailConfig,
    mockUnlockedContractAndRatesFormData,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import { unlockPackageStateEmail } from './index'
import type { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    generateRateName,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'

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
                    sha256: 'fakesha',
                },
            ],
            supportingDocuments: [],
            rateDateStart: new Date('2021-02-02'),
            rateDateEnd: new Date('2021-11-31'),
            rateDateCertified: new Date('2020-12-01'),
            rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
            rateAmendmentInfo: {
                effectiveDateStart: new Date('06/05/2021'),
                effectiveDateEnd: new Date('12/31/2021'),
            },
            actuaryContacts: [
                {
                    actuarialFirm: 'DELOITTE',
                    name: 'Actuary Contact 1',
                    titleRole: 'Test Actuary Contact 1',
                    email: 'actuarycontact1@example.com',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            packagesWithSharedRateCerts: [],
        },
    ],
}
const defaultStatePrograms = mockMNState().programs
const defaultSubmitters = ['test1@example.com', 'test2@example.com']

test('subject line is correct and clearly states submission is unlocked', async () => {
    const name = packageName(
        sub.stateCode,
        sub.stateNumber,
        sub.programIDs,
        defaultStatePrograms
    )
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig(),
        defaultStatePrograms,
        defaultSubmitters
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was unlocked by CMS`),
        })
    )
})

test('includes expected data summary for a contract and rates submission unlock State email', async () => {
    sub.rateInfos[0].rateCertificationName =
        'MCR-MN-0003-MSHO-RATE-20210202-20211201-CERTIFICATION-20201201'
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig(),
        defaultStatePrograms,
        defaultSubmitters
    )

    if (template instanceof Error) {
        throw template
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
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20221017',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateCertificationName:
                    'MCR-MN-0003-SNBC-RATE-20220201-20230201-CERTIFICATION-20221017',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'MERCER',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            {
                rateType: 'AMENDMENT',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: [
                    'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                ],
                rateCertificationName:
                    'MCR-MN-0003-MSC+-PMAP-RATE-20210605-20211231-AMENDMENT-20221017',
                rateDateStart: new Date('01/01/2022'),
                rateDateEnd: new Date('01/01/2023'),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date('06/05/2021'),
                    effectiveDateEnd: new Date('12/31/2021'),
                },
                actuaryContacts: [
                    {
                        actuarialFirm: 'GUIDEHOUSE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig(),
        defaultStatePrograms,
        defaultSubmitters
    )

    if (template instanceof Error) {
        throw template
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

it('does includes the correct submission URL', async () => {
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig(),
        defaultStatePrograms,
        defaultSubmitters
    )

    if (template instanceof Error) {
        console.error(template)
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                `http://localhost/submissions/test-abc-125/edit/review-and-submit`
            ),
        })
    )
})

test('renders overall email as expected', async () => {
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
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('01/02/2021'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20210102',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('02/02/2022'),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateCertificationName:
                    'MCR-MN-0003-SNBC-RATE-20220201-20230201-CERTIFICATION-20220202',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const template = await unlockPackageStateEmail(
        sub,
        unlockData,
        testEmailConfig(),
        defaultStatePrograms,
        defaultSubmitters
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
