import {
    testEmailConfig,
    mockContract,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import { packageName } from '../../common-code/healthPlanFormDataType'
import { newContractStateEmail } from './index'
import { formatEmailAddresses } from '../formatters'
import type { ContractType, RateFormDataType } from '../../domain-models'

const defaultSubmitters = ['submitter1@example.com', 'submitter2@example.com']

test('to addresses list includes submitter emails', async () => {
    const sub = mockContract()
    const defaultStatePrograms = mockMNState().programs
    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
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

test('to addresses list includes all state contacts on submission', async () => {
    const sub: ContractType = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.stateContacts = [
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
    ]
    const defaultStatePrograms = mockMNState().programs
    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

    sub.packageSubmissions[0].contractRevision.formData.stateContacts.forEach(
        (contact) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([contact.email]),
                })
            )
        }
    )
})

test('to addresses list does not include duplicate state receiver emails on submission', async () => {
    const sub: ContractType = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.stateContacts = [
        {
            name: 'test1',
            titleRole: 'Foo1',
            email: 'test1@example.com',
        },
        {
            name: 'test1',
            titleRole: 'Foo1',
            email: 'test1@example.com',
        },
    ]
    const defaultStatePrograms = mockMNState().programs
    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template.toAddresses).toEqual([
        'test1@example.com',
        ...defaultSubmitters,
        ...testEmailConfig().devReviewTeamEmails,
    ])
})

test('subject line is correct and clearly states submission is complete', async () => {
    const sub = mockContract()
    const defaultStatePrograms = mockMNState().programs
    const name = packageName(
        sub.stateCode,
        sub.stateNumber,
        sub.packageSubmissions[0].contractRevision.formData.programIDs,
        defaultStatePrograms
    )

    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

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
    const sub = mockContract()
    const defaultStatePrograms = mockMNState().programs
    const name = packageName(
        sub.stateCode,
        sub.stateNumber,
        sub.packageSubmissions[0].contractRevision.formData.programIDs,
        defaultStatePrograms
    )

    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

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
                `please reach out to ${formatEmailAddresses(
                    testEmailConfig().helpDeskEmail
                )}`
            ),
        })
    )
})

test('includes link to submission', async () => {
    const sub = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.contractType =
        'AMENDMENT'
    const defaultStatePrograms = mockMNState().programs
    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                `http://localhost/submissions/${sub.id}`
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyHTML: expect.stringContaining(
                `href="http://localhost/submissions/${sub.id}"`
            ),
        })
    )
})

test('includes information about what is next', async () => {
    const sub = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.contractType =
        'AMENDMENT'
    const defaultStatePrograms = mockMNState().programs
    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('What comes next:'),
        })
    )
})

test('includes expected data summary for a contract and rates submission State email', async () => {
    const sub: ContractType = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.contractDateStart =
        new Date('01/01/2021')
    sub.packageSubmissions[0].contractRevision.formData.contractDateEnd =
        new Date('01/01/2025')
    sub.packageSubmissions[0].contractRevision.formData.contractType = 'BASE'
    sub.packageSubmissions[0].rateRevisions[0].formData = {
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'foo',
                sha256: 'fakesha',
            },
        ],
        supportingDocuments: [],
        rateDateCertified: new Date('01/02/2021'),
        rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
        rateCertificationName:
            'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20210102',
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'MERCER',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@example.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        packagesWithSharedRateCerts: [],
    }
    const defaultStatePrograms = mockMNState().programs

    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

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
    //Expect only have 1 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.packageSubmissions[0].rateRevisions[0].formData
                    .rateCertificationName!
            ),
        })
    )
})

test('includes expected data summary for a multi-rate contract and rates submission State email', async () => {
    const sub: ContractType = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.contractDateStart =
        new Date('01/01/2021')
    sub.packageSubmissions[0].contractRevision.formData.contractDateEnd =
        new Date('01/01/2025')
    sub.packageSubmissions[0].contractRevision.formData.contractType = 'BASE'
    const rate1FormData: RateFormDataType = {
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'foo',
                sha256: 'fakesha',
            },
        ],
        supportingDocuments: [],
        rateDateCertified: new Date('01/02/2021'),
        rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
        rateCertificationName:
            'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20210102',
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'MERCER',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@example.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        packagesWithSharedRateCerts: [],
    }
    const rate2FormData: RateFormDataType = {
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'foo',
                sha256: 'fakesha',
            },
        ],
        supportingDocuments: [],
        rateDateCertified: new Date('02/02/2022'),
        rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        rateCertificationName:
            'MCR-MN-0003-SNBC-RATE-20220201-20230201-CERTIFICATION-20220202',
        rateDateStart: new Date('02/01/2022'),
        rateDateEnd: new Date('02/01/2023'),
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'DELOITTE',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@example.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        packagesWithSharedRateCerts: [],
    }
    const rate3FormData: RateFormDataType = {
        rateType: 'AMENDMENT',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'foo',
                sha256: 'fakesha',
            },
        ],
        supportingDocuments: [],
        rateDateCertified: new Date('01/02/2021'),
        rateProgramIDs: [
            'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
            'd95394e5-44d1-45df-8151-1cc1ee66f100',
        ],
        rateCertificationName:
            'MCR-MN-0003-MSC+-PMAP-RATE-20210605-20211231-AMENDMENT-20210102',
        rateDateStart: new Date('01/01/2022'),
        rateDateEnd: new Date('01/01/2023'),
        amendmentEffectiveDateStart: new Date('06/05/2021'),
        amendmentEffectiveDateEnd: new Date('12/31/2021'),
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'STATE_IN_HOUSE',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@example.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        packagesWithSharedRateCerts: [],
    }
    sub.packageSubmissions[0].rateRevisions = [
        {
            ...sub.packageSubmissions[0].rateRevisions[0],
            formData: rate1FormData,
        },
        {
            ...sub.packageSubmissions[0].rateRevisions[0],
            formData: rate2FormData,
        },
        {
            ...sub.packageSubmissions[0].rateRevisions[0],
            formData: rate3FormData,
        },
    ]

    const defaultStatePrograms = mockMNState().programs

    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

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
                sub.packageSubmissions[0].rateRevisions[0].formData
                    .rateCertificationName!
            ),
        })
    )
    //Second Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.packageSubmissions[0].rateRevisions[0].formData
                    .rateCertificationName!
            ),
        })
    )
    //Third Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.packageSubmissions[0].rateRevisions[0].formData
                    .rateCertificationName!
            ),
        })
    )
})

test('includes expected data summary for a rate amendment submission State email', async () => {
    const sub: ContractType = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.contractDateStart =
        new Date('01/01/2021')
    sub.packageSubmissions[0].contractRevision.formData.contractDateEnd =
        new Date('01/01/2025')
    sub.packageSubmissions[0].rateRevisions[0].formData = {
        rateType: 'AMENDMENT',

        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'foo',
                sha256: 'fakesha',
            },
        ],
        supportingDocuments: [],
        rateDateCertified: new Date('10/19/2022'),
        rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        rateCertificationName:
            'MCR-MN-0003-SNBC-RATE-20210605-20211231-AMENDMENT-20221019',
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        amendmentEffectiveDateStart: new Date('06/05/2021'),
        amendmentEffectiveDateEnd: new Date('12/31/2021'),
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'MERCER',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@example.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        packagesWithSharedRateCerts: [],
    }
    const statePrograms = mockMNState().programs

    const template = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        statePrograms
    )

    if (template instanceof Error) {
        throw template
    }

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
    //Expect only have 1 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.packageSubmissions[0].rateRevisions[0].formData
                    .rateCertificationName!
            ),
        })
    )
})

test('renders overall email for a new package with a rate amendment as expected', async () => {
    const sub: ContractType = mockContract()
    sub.packageSubmissions[0].contractRevision.formData.contractDateStart =
        new Date('01/01/2021')
    sub.packageSubmissions[0].contractRevision.formData.contractDateEnd =
        new Date('01/01/2025')
    sub.packageSubmissions[0].rateRevisions[0].formData = {
        rateType: 'AMENDMENT',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'foo',
                sha256: 'fakesha',
            },
        ],
        supportingDocuments: [],
        rateDateCertified: new Date('01/02/2021'),
        rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
        rateCertificationName:
            'MCR-MN-0003-MSHO-RATE-20210605-20211231-AMENDMENT-20210102',
        amendmentEffectiveDateStart: new Date('06/05/2021'),
        amendmentEffectiveDateEnd: new Date('12/31/2021'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'MERCER',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@example.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        packagesWithSharedRateCerts: [],
    }
    const defaultStatePrograms = mockMNState().programs
    const result = await newContractStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
