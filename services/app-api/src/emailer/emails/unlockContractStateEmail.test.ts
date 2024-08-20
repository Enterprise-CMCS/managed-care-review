import {
    testEmailConfig,
    mockMNState,
    mockContractRev,
} from '../../testHelpers/emailerHelpers'
import { unlockContractStateEmail } from './index'
import { packageName } from '../../common-code/healthPlanFormDataType'

const unlockData = {
    updatedBy: {
        email: 'josh@example.com',
        role: 'CMS_USER' as const,
        givenName: 'Josh',
        familyName: 'Knope',
    },
    updatedAt: new Date('02/01/2022'),
    updatedReason: 'Adding rate certification.',
}

const defaultStatePrograms = mockMNState().programs
const defaultSubmitters = ['test1@example.com', 'test2@example.com']

test('subject line is correct and clearly states submission is unlocked', async () => {
    const sub = mockContractRev()

    const name = packageName(
        sub.contract.stateCode,
        sub.contract.stateNumber,
        sub.formData.programIDs,
        defaultStatePrograms
    )
    const template = await unlockContractStateEmail(
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
    const sub = mockContractRev()

    const template = await unlockContractStateEmail(
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

    expect(template.bodyText?.match(/Rate Cert Name/)?.length).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.rateRevisions[0].formData.rateCertificationName ?? ''
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
    const sub = mockContractRev({
        rateRevisions: [
            {
                id: '12345',
                rateID: '6789',
                submitInfo: undefined,
                unlockInfo: undefined,
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    id: 'test-id-1234',
                    rateID: 'test-id-1234',
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [
                        {
                            s3URL: 's3://bucketname/key/test1',
                            name: 'foo',
                            sha256: 'fakesha',
                            dateAdded: new Date(11 / 27 / 2023),
                        },
                    ],
                    supportingDocuments: [],
                    rateDateStart: new Date('01/01/2024'),
                    rateDateEnd: new Date('01/01/2025'),
                    rateDateCertified: new Date('01/01/2024'),
                    amendmentEffectiveDateStart: new Date('01/01/2024'),
                    amendmentEffectiveDateEnd: new Date('01/01/2025'),
                    rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                    rateCertificationName: 'Rate Cert Name 1',
                    certifyingActuaryContacts: [
                        {
                            actuarialFirm: 'DELOITTE',
                            name: 'Actuary Contact 1',
                            titleRole: 'Test Actuary Contact 1',
                            email: 'actuarycontact1@example.com',
                        },
                    ],
                    addtlActuaryContacts: [],
                    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                    packagesWithSharedRateCerts: [
                        {
                            packageName: 'pkgName',
                            packageId: '12345',
                            packageStatus: 'SUBMITTED',
                        },
                    ],
                },
            },
            {
                id: '12345',
                rateID: '6789',
                submitInfo: undefined,
                unlockInfo: undefined,
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    id: 'test-id-1234',
                    rateID: 'test-id-1234',
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [
                        {
                            s3URL: 's3://bucketname/key/test1',
                            name: 'foo',
                            sha256: 'fakesha',
                            dateAdded: new Date(11 / 27 / 2023),
                        },
                    ],
                    supportingDocuments: [],
                    rateDateStart: new Date('01/01/2024'),
                    rateDateEnd: new Date('01/01/2025'),
                    rateDateCertified: new Date('01/01/2024'),
                    amendmentEffectiveDateStart: new Date('01/01/2024'),
                    amendmentEffectiveDateEnd: new Date('01/01/2025'),
                    rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                    rateCertificationName: 'Rate Cert Name 2',
                    certifyingActuaryContacts: [
                        {
                            actuarialFirm: 'DELOITTE',
                            name: 'Actuary Contact 1',
                            titleRole: 'Test Actuary Contact 1',
                            email: 'actuarycontact1@example.com',
                        },
                    ],
                    addtlActuaryContacts: [],
                    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                    packagesWithSharedRateCerts: [
                        {
                            packageName: 'pkgName',
                            packageId: '12345',
                            packageStatus: 'SUBMITTED',
                        },
                    ],
                },
            },
            {
                id: '12345',
                rateID: '6789',
                submitInfo: undefined,
                unlockInfo: undefined,
                createdAt: new Date(11 / 27 / 2023),
                updatedAt: new Date(11 / 27 / 2023),
                formData: {
                    id: 'test-id-1234',
                    rateID: 'test-id-1234',
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [
                        {
                            s3URL: 's3://bucketname/key/test1',
                            name: 'foo',
                            sha256: 'fakesha',
                            dateAdded: new Date(11 / 27 / 2023),
                        },
                    ],
                    supportingDocuments: [],
                    rateDateStart: new Date('01/01/2024'),
                    rateDateEnd: new Date('01/01/2025'),
                    rateDateCertified: new Date('01/01/2024'),
                    amendmentEffectiveDateStart: new Date('01/01/2024'),
                    amendmentEffectiveDateEnd: new Date('01/01/2025'),
                    rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                    rateCertificationName: 'Rate Cert Name 3',
                    certifyingActuaryContacts: [
                        {
                            actuarialFirm: 'DELOITTE',
                            name: 'Actuary Contact 1',
                            titleRole: 'Test Actuary Contact 1',
                            email: 'actuarycontact1@example.com',
                        },
                    ],
                    addtlActuaryContacts: [],
                    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                    packagesWithSharedRateCerts: [
                        {
                            packageName: 'pkgName',
                            packageId: '12345',
                            packageStatus: 'SUBMITTED',
                        },
                    ],
                },
            },
        ],
    })
    const template = await unlockContractStateEmail(
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
    expect(template.bodyText?.match(/Rate Cert Name/g)?.length).toBe(3)
    //First Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.rateRevisions[0].formData.rateCertificationName ?? ''
            ),
        })
    )
    //Second Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.rateRevisions[1].formData.rateCertificationName ?? ''
            ),
        })
    )
    //Third Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                sub.rateRevisions[2].formData.rateCertificationName ?? ''
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

test('does includes the correct submission URL', async () => {
    const sub = mockContractRev()
    const template = await unlockContractStateEmail(
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
                `http://localhost/submissions/12345/edit/review-and-submit`
            ),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub = mockContractRev()
    const template = await unlockContractStateEmail(
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
