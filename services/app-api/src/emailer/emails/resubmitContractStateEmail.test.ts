import {
    testEmailConfig,
    mockContract,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import { resubmitContractStateEmail } from './index'
import { packageName } from '../../common-code/healthPlanFormDataType'
import type { ContractType } from '../../domain-models'

const resubmitData = {
    updatedBy: {
        email: 'bob@example.com',
        role: 'STATE_USER' as const,
        givenName: 'Bob',
        familyName: 'Vila',
    },
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Added rate certification.',
}
const submission: ContractType = {
    ...mockContract(),
}
const defaultStatePrograms = mockMNState().programs
const defaultSubmitters = ['test1@example.com', 'test2@example.com']

test('contains correct subject and clearly states successful resubmission', async () => {
    const name = packageName(
        submission.stateCode,
        submission.stateNumber,
        submission.packageSubmissions[0].contractRevision.formData.programIDs,
        defaultStatePrograms
    )
    const template = await resubmitContractStateEmail(
        submission,
        defaultSubmitters,
        resubmitData,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
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

test('includes expected data summary for a contract and rates resubmission State email', async () => {
    submission.packageSubmissions[0].rateRevisions[0].formData.rateCertificationName =
        'MCR-MN-0003-MSHO-RATE-20210202-20211201-CERTIFICATION-20201201'
    const template = await resubmitContractStateEmail(
        submission,
        defaultSubmitters,
        resubmitData,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
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
    //Expect only have 1 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                submission.packageSubmissions[0].rateRevisions[0].formData
                    .rateCertificationName
            ),
        })
    )
})

test('includes expected data summary for a multi-rate contract and rates resubmission State email', async () => {
    const contract = mockContract()
    const sub: ContractType = {
        ...contract,
        packageSubmissions: [
            {
                ...contract.packageSubmissions[0],
                contractRevision: {
                    ...contract.packageSubmissions[0].contractRevision,
                    formData: {
                        ...contract.packageSubmissions[0].contractRevision
                            .formData,
                        contractDateStart: new Date('01/01/2021'),
                        contractDateEnd: new Date('01/01/2025'),
                    },
                },
                rateRevisions: [
                    {
                        ...contract.packageSubmissions[0].rateRevisions[0],
                        formData: {
                            ...contract.packageSubmissions[0].rateRevisions[0]
                                .formData,
                            rateType: 'NEW',
                            rateDocuments: [
                                {
                                    s3URL: 's3://bucketname/key/test1',
                                    name: 'foo',
                                    sha256: 'fakesha',
                                },
                            ],
                            supportingDocuments: [],
                            rateDateCertified: new Date('10/17/2022'),
                            rateProgramIDs: [
                                '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                            ],
                            rateCertificationName:
                                'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20221017',
                            rateDateStart: new Date('01/01/2021'),
                            rateDateEnd: new Date('01/01/2022'),
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
                        },
                    },
                    {
                        ...contract.packageSubmissions[0].rateRevisions[0],
                        formData: {
                            ...contract.packageSubmissions[0].rateRevisions[0]
                                .formData,
                            rateType: 'NEW',
                            rateDocuments: [
                                {
                                    s3URL: 's3://bucketname/key/test1',
                                    name: 'foo',
                                    sha256: 'fakesha',
                                },
                            ],
                            supportingDocuments: [],
                            rateDateCertified: new Date('10/17/2022'),
                            rateProgramIDs: [
                                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                            ],
                            rateCertificationName:
                                'MCR-MN-0003-SNBC-RATE-20220201-20230201-CERTIFICATION-20221017',
                            rateDateStart: new Date('02/01/2022'),
                            rateDateEnd: new Date('02/01/2023'),
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
                        },
                    },
                    {
                        ...contract.packageSubmissions[0].rateRevisions[0],
                        formData: {
                            ...contract.packageSubmissions[0].rateRevisions[0]
                                .formData,
                            rateType: 'AMENDMENT',
                            rateDocuments: [
                                {
                                    s3URL: 's3://bucketname/key/test1',
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
                        },
                    },
                ],
            },
        ],
    }
    const template = await resubmitContractStateEmail(
        sub,
        defaultSubmitters,
        resubmitData,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
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
                sub.packageSubmissions[0].rateRevisions[1].formData
                    .rateCertificationName!
            ),
        })
    )
    //Third Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.packageSubmissions[0].rateRevisions[2].formData
                    .rateCertificationName!
            ),
        })
    )
})

test('renders overall email as expected', async () => {
    const template = await resubmitContractStateEmail(
        submission,
        defaultSubmitters,
        resubmitData,
        testEmailConfig(),
        defaultStatePrograms
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
