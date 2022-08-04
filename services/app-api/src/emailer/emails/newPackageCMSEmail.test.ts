import {
    testEmailConfig,
    testStateAnalystsEmails,
    testDuplicateEmailConfig,
    testDuplicateStateAnalystsEmails,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    findProgramsHelper as findPrograms,
} from '../../testHelpers/emailerHelpers'
import {
    generateRateName,
    LockedHealthPlanFormDataType,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { newPackageCMSEmail } from './index'
import { findAllPackageProgramIds } from '../templateHelpers'

test('to addresses list includes review email addresses from email config', async () => {
    const sub = mockContractOnlyFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    testEmailConfig.cmsReviewSharedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('to addresses list does not include duplicate review email addresses', async () => {
    const sub = mockContractAndRatesFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testDuplicateEmailConfig,
        testDuplicateStateAnalystsEmails,
        programs
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.toAddresses).toEqual(['duplicate@example.com'])
})

test('subject line is correct', async () => {
    const sub = mockContractOnlyFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const name = packageName(sub, programs)

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `New Managed Care Submission: ${name}`
            ),
        })
    )
})

test('includes expected data summary for a contract only submission', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractOnlyFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
    }
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action only'
            ),
        })
    )
    expect(template).not.toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('Rating period:'),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Contract effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
})

test('includes expected data summary for a contract and rates submission CMS email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
    }
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const rateName = generateRateName(sub, programs)
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )

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

test('includes expected data summary for a contract amendment submission', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAmendmentFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
    }
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const rateName = generateRateName(sub, programs)
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )

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
                'Contract amendment effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(rateName),
        })
    )
})

test('includes expected data summary for a rate amendment submission CMS email', async () => {
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
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const rateName = generateRateName(sub, programs)

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )

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

test('includes link to submission', async () => {
    const sub = mockContractAmendmentFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                `http://localhost/submissions/${sub.id}`
            ),
        })
    )
})

test('includes state specific analyst on contract only submission', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        testStateAnalystEmails,
        programs
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testStateAnalystEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('includes state specific analyst on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        testStateAnalystEmails,
        programs
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testEmailConfig.ratesReviewSharedEmails,
        ...testStateAnalystEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include state specific analyst on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )

    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('includes ratesReviewSharedEmails on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testEmailConfig.ratesReviewSharedEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include ratesReviewSharedEmails on contract only submission', async () => {
    const sub = mockContractOnlyFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    const ratesReviewerEmails = [...testEmailConfig.ratesReviewSharedEmails]
    ratesReviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract only submission does include state specific analysts emails', async () => {
    const sub = mockContractOnlyFormData()
    //Sets CHIP program for package programs
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const testStateAnalystEmails = testStateAnalystsEmails
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        testStateAnalystEmails,
        programs
    )
    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract and rate submission does include state specific analysts emails', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        testStateAnalystEmails,
        programs
    )
    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract only submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', async () => {
    const sub = mockContractOnlyFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    const excludedEmails = [...testEmailConfig.ratesReviewSharedEmails]

    console.log(template)
    excludedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract and rate submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', async () => {
    const sub = mockContractAndRatesFormData()
    //Set CHIP program for rate certification programs
    sub.rateProgramIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    const excludedEmails = [
        ...testEmailConfig.ratesReviewSharedEmails,
        testEmailConfig.cmsRateHelpEmailAddress,
    ]
    excludedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include rate name on contract only submission', async () => {
    const sub = mockContractOnlyFormData()
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        programs
    )
    expect(template).toEqual(
        expect.not.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('2021-01-01'),
        contractDateEnd: new Date('2021-12-31'),
        rateDateStart: new Date('2021-02-02'),
        rateDateEnd: new Date('2021-11-31'),
        rateDateCertified: new Date('2020-12-01'),
    }
    const programs = findPrograms(sub.stateCode, findAllPackageProgramIds(sub))

    if (programs instanceof Error) {
        throw new Error(programs.message)
    }

    const result = await newPackageCMSEmail(sub, testEmailConfig, [], programs)
    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
